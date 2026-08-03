/**
 * Importação de aprovações a partir de e-mail.
 *
 * Aceita dois formatos colados no painel:
 *  1. O bloco estruturado que o Copilot do Outlook devolve quando alimentado
 *     com PROMPT_COPILOT (chave: valor por linha);
 *  2. O texto bruto do e-mail (Ctrl+A / Ctrl+C na mensagem), de onde
 *     extraímos assunto, remetentes, datas, valores e período por heurística.
 *
 * O resultado nunca é salvo direto: pré-preenche o formulário para o gestor
 * revisar. Por isso as heurísticas podem errar sem causar dano.
 */

import type { Aprovacao, Pessoa, TipoAprovacao } from "../types";
import { hojeISO, somarDias } from "./datas";
import { novoId } from "./formato";

export interface Importacao {
  aprovacao: Aprovacao;
  /** Descrição amigável do que foi extraído, para o gestor conferir. */
  detectados: string[];
}

export const PROMPT_COPILOT = `Leia este e-mail e preencha o modelo abaixo. Responda APENAS com o bloco preenchido, sem comentários. Se uma informação não existir no e-mail, deixe o campo em branco depois dos dois-pontos.

TIPO: (um destes: Viagem | Mobilidade (Uber/táxi) | Reembolso de despesa | Orçamento | Compra / Contrato | Hora extra | Desligamento / Contratação | Outro)
SOLICITANTE: (nome de quem pede a aprovação)
DESCRICAO: (resumo em uma linha do que precisa ser aprovado)
VALOR: (valor total em reais, só números, ex.: 3450,00)
DATA_PEDIDO: (data em que o pedido foi enviado, dd/mm/aaaa)
PERIODO: (se for viagem: dd/mm/aaaa a dd/mm/aaaa)
CENTRO_CUSTO: (área ou centro de custo, se citado)
OBSERVACAO: (detalhes que ajudam a decidir: trechos, preferências, urgência)`;

// ------------------------------------------------------------- utilitários

/** Minúsculas e sem acentos, para comparações tolerantes. */
function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const MESES_NOME: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

function montaISO(ano: number, mes: number, dia: number): string | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || ano < 2000 || ano > 2100) {
    return null;
  }
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * Interpreta uma data em qualquer formato comum de e-mail pt-BR:
 * "2026-08-03", "03/08/2026", "03/08/26", "03/08" (usa anoPadrao),
 * "2 de agosto de 2026".
 */
export function parseData(texto: string, anoPadrao?: number): string | null {
  let m = texto.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) return montaISO(Number(m[1]), Number(m[2]), Number(m[3]));

  m = texto.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (m) {
    const ano = m[3]
      ? m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
      : anoPadrao;
    if (!ano) return null;
    return montaISO(ano, Number(m[2]), Number(m[1]));
  }

  m = normalizar(texto).match(/\b(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?\b/);
  if (m && MESES_NOME[m[2]]) {
    const ano = m[3] ? Number(m[3]) : anoPadrao;
    if (!ano) return null;
    return montaISO(ano, MESES_NOME[m[2]], Number(m[1]));
  }
  return null;
}

/**
 * Valor monetário pt-BR: "R$ 3.450,00" → 3450, "412,60" → 412.6.
 * Ponto sem vírgula só é decimal quando não parece separador de milhar
 * ("3.450" → 3450, "12.5" → 12.5).
 */
export function parseValor(texto: string): number | null {
  const limpo = texto.replace(/r\$/gi, "").replace(/[^\d.,]/g, "");
  if (!/\d/.test(limpo)) return null;
  let n: number;
  if (limpo.includes(",")) {
    n = Number(limpo.replace(/\./g, "").replace(",", "."));
  } else if (limpo.includes(".")) {
    const partes = limpo.split(".");
    const decimais = partes[partes.length - 1];
    n = partes.length >= 2 && decimais.length === 3
      ? Number(limpo.replace(/\./g, ""))
      : Number(limpo);
  } else {
    n = Number(limpo);
  }
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// -------------------------------------------------------- pessoas no texto

const CONECTIVOS = new Set(["de", "da", "do", "das", "dos", "e"]);

function tokensDeNome(nome: string): string[] {
  return normalizar(nome)
    .split(/[^a-z]+/)
    .filter((t) => t.length >= 2 && !CONECTIVOS.has(t));
}

/** "Almir de Matos" casa com "Almir Matos" (subconjunto de tokens). */
function nomesCasam(a: string, b: string): boolean {
  const ta = tokensDeNome(a);
  const tb = tokensDeNome(b);
  if (ta.length === 0 || tb.length === 0) return false;
  const [menor, maior] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return menor.every((t) => maior.includes(t));
}

function achaPessoa(
  pessoas: Pessoa[],
  nome?: string,
  email?: string,
): Pessoa | null {
  if (email) {
    const alvo = email.toLowerCase();
    const porEmail = pessoas.find((p) => p.email.toLowerCase() === alvo);
    if (porEmail) return porEmail;
  }
  if (nome) {
    const porNome = pessoas.find((p) => nomesCasam(p.nome, nome));
    if (porNome) return porNome;
  }
  return null;
}

/**
 * Varre o texto por pares "Nome <email>" e linhas "De: Nome", na ordem em
 * que aparecem, e devolve a primeira pessoa que existir no cadastro.
 * Remetentes fora do cadastro (agência de viagens, RH) são ignorados.
 */
function acharSolicitante(texto: string, pessoas: Pessoa[]): Pessoa | null {
  const candidatos: { indice: number; nome?: string; email?: string }[] = [];

  const rePar = /([A-Za-zÀ-ú][A-Za-zÀ-ú.'\- ]{1,60})\s*<\s*([\w.+\-]+@[\w.\-]+)\s*>/g;
  for (let m = rePar.exec(texto); m; m = rePar.exec(texto)) {
    candidatos.push({ indice: m.index, nome: m[1].trim(), email: m[2].trim() });
  }
  const reDe = /^\s*De:?\s+([^<\n]{2,60}?)\s*(?:<|$)/gim;
  for (let m = reDe.exec(texto); m; m = reDe.exec(texto)) {
    candidatos.push({ indice: m.index, nome: m[1].trim() });
  }

  candidatos.sort((a, b) => a.indice - b.indice);
  for (const c of candidatos) {
    const p = achaPessoa(pessoas, c.nome, c.email);
    if (p) return p;
  }
  return null;
}

// ------------------------------------------------------------ tipo e datas

/** Ordem importa: termos específicos (uber) antes dos genéricos (viagem). */
const REGRAS_TIPO: [TipoAprovacao, RegExp][] = [
  ["Mobilidade (Uber/táxi)", /\buber\b|\btaxis?\b|\b99\b|corridas?\b/],
  ["Reembolso de despesa", /reembolso/],
  ["Hora extra", /horas?\s+extras?/],
  ["Desligamento / Contratação", /desligamento|contratacao|admissao|demissao/],
  ["Compra / Contrato", /contrato|aquisicao|\bcompra\b/],
  ["Orçamento", /orcamento|\bverba\b|budget/],
  ["Viagem", /viagem|\bvoos?\b|aereo|passagem|hospedagem|hotel|diarias?|cotacao/],
];

function detectarTipo(texto: string): TipoAprovacao | null {
  const norm = normalizar(texto);
  for (const [tipo, re] of REGRAS_TIPO) if (re.test(norm)) return tipo;
  return null;
}

/** Assunto do e-mail: linha "RES:/ENC:/Assunto:" mais próxima do topo. */
function acharAssunto(texto: string): string | null {
  const reAssunto = /^\s*Assunto:\s*(.+)$/im;
  const rePrefixo = /^\s*(?:RES|RE|ENC|FW|FWD|VS|AW):\s*(.+)$/im;
  const mA = reAssunto.exec(texto);
  const mP = rePrefixo.exec(texto);
  let bruto: string | null = null;
  if (mA && mP) bruto = (mA.index <= mP.index ? mA : mP)[1];
  else bruto = (mA ?? mP)?.[1] ?? null;
  if (!bruto) return null;
  // Threads acumulam prefixos: "RES: ENC: RES: assunto".
  let limpo = bruto.trim();
  for (let i = 0; i < 6; i += 1) {
    const sem = limpo.replace(/^(?:RES|RE|ENC|FW|FWD|VS|AW):\s*/i, "");
    if (sem === limpo) break;
    limpo = sem;
  }
  return limpo || null;
}

/** Data de envio do e-mail mais recente (primeira ocorrência no texto). */
function acharDataEnvio(texto: string): string | null {
  const padroes = [
    // Cabeçalho do Outlook web: "Data Seg, 2026-08-03 10:16"
    /^\s*Data\s+.{0,12}?(\d{4}-\d{1,2}-\d{1,2})/im,
    // "Enviada em: domingo, 2 de agosto de 2026 10:52"
    /Enviad[ao]\s+em:?\s*(?:[^,\n]{0,20},)?\s*([^\n]+)/i,
    /^\s*Data:?\s*([^\n]+)$/im,
  ];
  let melhor: { indice: number; iso: string } | null = null;
  for (const re of padroes) {
    const m = re.exec(texto);
    if (!m) continue;
    const iso = parseData(m[1]);
    if (iso && (melhor === null || m.index < melhor.indice)) {
      melhor = { indice: m.index, iso };
    }
  }
  return melhor?.iso ?? null;
}

/** Intervalo tipo "24/08 A 01/09/2026" ou "24/08/2026 a 01/09/2026". */
function acharPeriodo(
  texto: string,
  anoPadrao: number,
): { inicio: string; fim: string } | null {
  const re =
    /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*(?:a|à|ate|até|x|ao|[-–])\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i;
  const m = re.exec(texto);
  if (!m) return null;
  // O ano costuma vir só na segunda data ("24/08 A 01/09/2026").
  const fim = parseData(m[2], anoPadrao);
  if (!fim) return null;
  const inicio = parseData(m[1], Number(fim.slice(0, 4)));
  if (!inicio) return null;
  return { inicio, fim };
}

// ------------------------------------------------------- formato Copilot

const CHAVES: Record<string, string> = {
  tipo: "tipo",
  solicitante: "solicitante",
  descricao: "descricao",
  valor: "valor",
  data_pedido: "data_pedido",
  datapedido: "data_pedido",
  periodo: "periodo",
  centro_custo: "centro_custo",
  centrocusto: "centro_custo",
  observacao: "observacao",
  prazo: "prazo",
  link: "link",
};

function lerBlocoEstruturado(texto: string): Map<string, string> | null {
  const campos = new Map<string, string>();
  for (const linha of texto.split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Za-zÀ-ú_ ]{3,20}?)\s*:\s*(.*)$/);
    if (!m) continue;
    const chave = CHAVES[normalizar(m[1]).replace(/\s+/g, "_")];
    if (chave && !campos.has(chave)) campos.set(chave, m[2].trim());
  }
  // Exige pelo menos dois campos do modelo para não confundir um e-mail
  // bruto (que tem "De:", "Assunto:") com a saída do Copilot.
  return campos.size >= 2 ? campos : null;
}

// ---------------------------------------------------------------- principal

function base(): Aprovacao {
  const hoje = hojeISO();
  return {
    id: novoId("a"),
    tipo: "Outro",
    solicitanteId: null,
    descricao: "",
    valor: 0,
    dataSolicitacao: hoje,
    prazoResposta: somarDias(hoje, 3),
    status: "Pendente",
    dataDecisao: null,
    centroCusto: "",
    link: "",
    observacao: "",
    recorrenciaDias: 0,
  };
}

const TIPOS_VALIDOS: TipoAprovacao[] = [
  "Viagem", "Mobilidade (Uber/táxi)", "Reembolso de despesa", "Orçamento",
  "Compra / Contrato", "Hora extra", "Desligamento / Contratação", "Outro",
];

function tipoDeTexto(valor: string): TipoAprovacao | null {
  const norm = normalizar(valor);
  const exato = TIPOS_VALIDOS.find((t) => normalizar(t) === norm);
  return exato ?? detectarTipo(valor);
}

/**
 * Interpreta o texto colado (bloco do Copilot ou e-mail bruto) e devolve
 * uma Aprovacao pré-preenchida + a lista do que foi detectado.
 */
export function interpretarEmail(texto: string, pessoas: Pessoa[]): Importacao {
  const aprovacao = base();
  const detectados: string[] = [];
  const anoAtual = Number(hojeISO().slice(0, 4));

  const bloco = lerBlocoEstruturado(texto);

  if (bloco) {
    const tipo = bloco.get("tipo") ? tipoDeTexto(bloco.get("tipo")!) : null;
    if (tipo) {
      aprovacao.tipo = tipo;
      detectados.push(`Tipo: ${tipo}`);
    }
    const descricao = bloco.get("descricao");
    if (descricao) {
      aprovacao.descricao = descricao;
      detectados.push("Descrição");
    }
    const solicitante = bloco.get("solicitante");
    if (solicitante) {
      const p = achaPessoa(pessoas, solicitante);
      if (p) {
        aprovacao.solicitanteId = p.id;
        detectados.push(`Solicitante: ${p.nome}`);
      } else {
        aprovacao.observacao = `Solicitante: ${solicitante}`;
        detectados.push(`Solicitante "${solicitante}" não está no cadastro de pessoas`);
      }
    }
    const valor = bloco.get("valor") ? parseValor(bloco.get("valor")!) : null;
    if (valor !== null) {
      aprovacao.valor = valor;
      detectados.push("Valor");
    }
    const dataPedido = bloco.get("data_pedido")
      ? parseData(bloco.get("data_pedido")!, anoAtual)
      : null;
    if (dataPedido) {
      aprovacao.dataSolicitacao = dataPedido;
      detectados.push("Data do pedido");
    }
    const prazo = bloco.get("prazo") ? parseData(bloco.get("prazo")!, anoAtual) : null;
    if (prazo) aprovacao.prazoResposta = prazo;
    const periodo = bloco.get("periodo");
    if (periodo) {
      const intervalo = acharPeriodo(periodo, anoAtual);
      const nota = intervalo
        ? `Período: ${intervalo.inicio.split("-").reverse().join("/")} a ${intervalo.fim.split("-").reverse().join("/")}`
        : `Período: ${periodo}`;
      aprovacao.observacao = [aprovacao.observacao, nota].filter(Boolean).join(" · ");
      detectados.push("Período");
    }
    const cc = bloco.get("centro_custo");
    if (cc) {
      aprovacao.centroCusto = cc;
      detectados.push("Centro de custo");
    }
    const obs = bloco.get("observacao");
    if (obs) {
      aprovacao.observacao = [aprovacao.observacao, obs].filter(Boolean).join(" · ");
    }
    const link = bloco.get("link");
    if (link) aprovacao.link = link;
    return { aprovacao, detectados };
  }

  // ------------------------------------------------------- e-mail bruto

  const assunto = acharAssunto(texto);
  if (assunto) {
    aprovacao.descricao = assunto;
    detectados.push("Descrição (assunto do e-mail)");
  } else {
    const primeiraLinha = texto
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 4);
    if (primeiraLinha) aprovacao.descricao = primeiraLinha.slice(0, 120);
  }

  const tipo = detectarTipo(assunto ?? "") ?? detectarTipo(texto);
  if (tipo) {
    aprovacao.tipo = tipo;
    detectados.push(`Tipo: ${tipo}`);
  }

  const solicitante = acharSolicitante(texto, pessoas);
  if (solicitante) {
    aprovacao.solicitanteId = solicitante.id;
    detectados.push(`Solicitante: ${solicitante.nome}`);
  }

  const envio = acharDataEnvio(texto);
  if (envio) {
    aprovacao.dataSolicitacao = envio;
    detectados.push("Data do pedido (envio do e-mail)");
  }

  const periodo = acharPeriodo(assunto ?? texto, anoAtual) ?? acharPeriodo(texto, anoAtual);
  if (periodo) {
    aprovacao.observacao = `Período: ${periodo.inicio.split("-").reverse().join("/")} a ${periodo.fim.split("-").reverse().join("/")}`;
    detectados.push("Período");
  }

  let maiorValor: number | null = null;
  const reValor = /R\$\s*[\d.,]+/gi;
  for (let m = reValor.exec(texto); m; m = reValor.exec(texto)) {
    const v = parseValor(m[0]);
    if (v !== null && (maiorValor === null || v > maiorValor)) maiorValor = v;
  }
  if (maiorValor !== null) {
    aprovacao.valor = maiorValor;
    detectados.push("Valor (maior R$ citado no e-mail)");
  }

  return { aprovacao, detectados };
}
