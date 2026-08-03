/**
 * Sincronização com o GitHub via API de conteúdo.
 *
 * O repositório funciona como servidor: o banco vira `banco.json` e cada
 * ata vira um `.md` versionado sob a pasta do seu processo. Isso dá
 * histórico, acesso de qualquer máquina e backup — sem instalar nada.
 *
 * O token é um PAT de escopo fino, restrito a um repositório, com
 * permissão de leitura e escrita apenas em "Contents". Fica no
 * localStorage sob chave própria: nunca entra no backup JSON nem nos CSVs.
 */

const API = "https://api.github.com";
const CHAVE_TOKEN = "lr-gestao-git-token";

export function lerToken(): string {
  try {
    return localStorage.getItem(CHAVE_TOKEN) ?? "";
  } catch {
    return "";
  }
}

export function gravarToken(token: string): void {
  if (token) localStorage.setItem(CHAVE_TOKEN, token);
  else localStorage.removeItem(CHAVE_TOKEN);
}

export interface AlvoGit {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

export class ErroGit extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ErroGit";
  }
}

function cabecalhos(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** Mensagem legível para os erros que o gestor pode de fato corrigir. */
function mensagemDeErro(status: number, corpo: string): string {
  if (status === 401) return "Token inválido ou expirado. Gere um novo no GitHub.";
  if (status === 403) {
    return "Token sem permissão de escrita em Contents, ou limite de uso atingido.";
  }
  if (status === 404) {
    return "Repositório, branch ou caminho não encontrado — confira owner, repo e branch.";
  }
  if (status === 409) {
    return "Conflito: o arquivo mudou no GitHub desde a última leitura. Sincronize de novo.";
  }
  if (status === 422) return "Requisição recusada pelo GitHub (branch inexistente?).";
  return `Falha na comunicação com o GitHub (HTTP ${status}). ${corpo.slice(0, 140)}`;
}

async function requisitar(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<unknown> {
  let resposta: Response;
  try {
    resposta = await fetch(url, { ...init, headers: cabecalhos(token) });
  } catch {
    throw new ErroGit("Sem conexão com o GitHub. Verifique a rede.");
  }
  if (resposta.status === 404) throw new ErroGit(mensagemDeErro(404, ""), 404);
  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => "");
    throw new ErroGit(mensagemDeErro(resposta.status, corpo), resposta.status);
  }
  return resposta.json();
}

// ------------------------------------------------------------- codificação

/** Base64 seguro para UTF-8 (btoa sozinho quebra em acentos). */
function paraBase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
}

function deBase64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// ------------------------------------------------------------------ API

interface RespostaConteudo {
  sha?: string;
  content?: string;
  html_url?: string;
}

/** Confere credencial e acesso ao repositório antes de gravar qualquer coisa. */
export async function testarAcesso(alvo: AlvoGit): Promise<string> {
  const dados = (await requisitar(
    `${API}/repos/${alvo.owner}/${alvo.repo}`,
    alvo.token,
  )) as { full_name?: string; permissions?: { push?: boolean }; private?: boolean };
  if (!dados.permissions?.push) {
    throw new ErroGit(
      "O token enxerga o repositório mas não tem permissão de escrita (Contents: Read and write).",
    );
  }
  return `${dados.full_name ?? `${alvo.owner}/${alvo.repo}`}${dados.private ? " (privado)" : " (público)"}`;
}

/** Lê um arquivo. Retorna null quando ele ainda não existe. */
export async function lerArquivo(
  alvo: AlvoGit,
  caminho: string,
): Promise<{ conteudo: string; sha: string } | null> {
  const url = `${API}/repos/${alvo.owner}/${alvo.repo}/contents/${encodeURI(caminho)}?ref=${encodeURIComponent(alvo.branch)}`;
  try {
    const dados = (await requisitar(url, alvo.token)) as RespostaConteudo;
    if (!dados.content || !dados.sha) return null;
    return { conteudo: deBase64(dados.content), sha: dados.sha };
  } catch (e) {
    if (e instanceof ErroGit && e.status === 404) return null;
    throw e;
  }
}

/**
 * Grava (cria ou atualiza) um arquivo. O `sha` do arquivo existente é
 * obrigatório na atualização — sem ele o GitHub recusa, o que evita
 * sobrescrever cegamente uma versão mais nova.
 */
export async function gravarArquivo(
  alvo: AlvoGit,
  caminho: string,
  conteudo: string,
  mensagem: string,
): Promise<string> {
  const existente = await lerArquivo(alvo, caminho);
  const url = `${API}/repos/${alvo.owner}/${alvo.repo}/contents/${encodeURI(caminho)}`;
  const corpo: Record<string, unknown> = {
    message: mensagem,
    content: paraBase64(conteudo),
    branch: alvo.branch,
  };
  if (existente) corpo.sha = existente.sha;

  const dados = (await requisitar(url, alvo.token, {
    method: "PUT",
    body: JSON.stringify(corpo),
  })) as { content?: RespostaConteudo };
  return dados.content?.html_url ?? "";
}

/** URL da pasta no GitHub, para abrir o histórico no navegador. */
export function urlDaPasta(
  owner: string,
  repo: string,
  branch: string,
  caminho: string,
): string {
  return `https://github.com/${owner}/${repo}/tree/${branch}/${caminho}`;
}
