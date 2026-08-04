/**
 * Sincronização do banco entre aparelhos.
 *
 * Regra de ouro: nunca sobrescrever o que este aparelho não viu. Toda
 * gravação declara a versão conhecida; se o servidor tiver outra, o envio
 * é recusado e o usuário decide o que fazer. Perder dado por descuido de
 * ordem de sincronização é o cenário que este módulo existe para impedir.
 */

import type { Banco } from "../types";
import { serializar } from "./armazenamento";
import { ataParaMarkdown, nomeArquivoAta, pastaDoProcesso } from "./atas";
import {
  ErroConflito,
  ErroGit,
  gravarArquivo,
  lerArquivo,
  type AlvoGit,
} from "./github";
import { migrar } from "./migracao";

export function caminhoDoBanco(pasta: string): string {
  return `${pasta || "gestao"}/banco.json`;
}

function caminhoDaAta(banco: Banco, ataId: string): string {
  const ata = banco.atas.find((a) => a.id === ataId)!;
  const processo = banco.processos.find((p) => p.id === ata.processoId);
  return `${banco.git.pasta || "gestao"}/atas/${pastaDoProcesso(processo, ata.processoId)}/${nomeArquivoAta(ata, processo)}`;
}

export interface ResultadoEnvio {
  banco: Banco;
  atasEnviadas: number;
  resumo: string;
}

/**
 * Envia o banco e as atas ainda não sincronizadas.
 *
 * As atas vão primeiro: se o envio do banco falhar por conflito, os
 * arquivos de ata já estão salvos no repositório e nada se perde — o
 * próximo envio só reconcilia o índice.
 */
export async function enviarTudo(
  alvo: AlvoGit,
  banco: Banco,
): Promise<ResultadoEnvio> {
  const agora = new Date().toISOString();
  const pendentes = banco.atas.filter((a) => !a.sincronizadaEm);

  const caminhosPorAta = new Map<string, string>();
  for (const ata of pendentes) {
    const caminho = caminhoDaAta(banco, ata.id);
    const processo = banco.processos.find((p) => p.id === ata.processoId);
    // Atas são arquivos por data: gravação direta, sem disputa de versão.
    await gravarArquivo(
      alvo,
      caminho,
      ataParaMarkdown(ata, processo, banco.pessoas),
      `Ata: ${processo?.nome ?? "processo"} — ${ata.data}`,
      undefined,
    );
    caminhosPorAta.set(ata.id, caminho);
  }

  const comAtas: Banco = {
    ...banco,
    atas: banco.atas.map((a) =>
      caminhosPorAta.has(a.id)
        ? { ...a, sincronizadaEm: agora, caminhoGit: caminhosPorAta.get(a.id)! }
        : a,
    ),
  };

  const resultado = await gravarArquivo(
    alvo,
    caminhoDoBanco(banco.git.pasta),
    serializar(comAtas),
    `Painel de gestão: atualiza dados (${agora.slice(0, 16).replace("T", " ")})`,
    banco.git.shaBanco,
  );

  return {
    banco: {
      ...comAtas,
      git: { ...comAtas.git, ultimaSync: agora, shaBanco: resultado.sha },
    },
    atasEnviadas: pendentes.length,
    resumo:
      pendentes.length > 0
        ? `Dados salvos no GitHub · ${pendentes.length} ata(s) enviada(s)`
        : "Dados salvos no GitHub",
  };
}

export interface ResultadoBaixa {
  banco: Banco;
  resumo: string;
}

/** Traz o banco do repositório, substituindo o deste aparelho. */
export async function baixarTudo(
  alvo: AlvoGit,
  bancoLocal: Banco,
): Promise<ResultadoBaixa> {
  const caminho = caminhoDoBanco(bancoLocal.git.pasta);
  const arquivo = await lerArquivo(alvo, caminho);
  if (!arquivo) {
    throw new ErroGit(
      `Nenhum dado encontrado em ${caminho}. Use "Salvar no GitHub" primeiro.`,
    );
  }

  const remoto = migrar(JSON.parse(arquivo.conteudo));
  return {
    // A configuração de conexão é deste aparelho e não vem do servidor.
    banco: {
      ...remoto,
      git: {
        ...bancoLocal.git,
        ultimaSync: new Date().toISOString(),
        shaBanco: arquivo.sha,
      },
    },
    resumo: `${remoto.pessoas.length} pessoas · ${remoto.processos.length} processos · ${remoto.atas.length} atas`,
  };
}

export type EstadoSync =
  | { tipo: "desligado" }
  | { tipo: "ocioso" }
  | { tipo: "pendente" }
  | { tipo: "enviando" }
  | { tipo: "baixando" }
  | { tipo: "salvo"; em: string }
  | { tipo: "conflito"; mensagem: string }
  | { tipo: "erro"; mensagem: string };

/** Texto curto de status, para a barra lateral. */
export function rotuloEstado(estado: EstadoSync): string {
  switch (estado.tipo) {
    case "desligado":
      return "Só neste aparelho";
    case "ocioso":
      return "Sincronizado";
    case "pendente":
      return "Alterações não salvas…";
    case "enviando":
      return "Salvando no GitHub…";
    case "baixando":
      return "Buscando dados…";
    case "salvo":
      return `Salvo ${new Date(estado.em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    case "conflito":
      return "Conflito — ação necessária";
    case "erro":
      return "Falha ao salvar";
  }
}

export function tomEstado(estado: EstadoSync): "bom" | "atencao" | "critico" | "neutro" {
  if (estado.tipo === "conflito" || estado.tipo === "erro") return "critico";
  if (estado.tipo === "pendente") return "atencao";
  if (estado.tipo === "salvo" || estado.tipo === "ocioso") return "bom";
  return "neutro";
}

/** Erro humano para qualquer falha vinda da sincronização. */
export function mensagemDoErro(e: unknown): string {
  if (e instanceof ErroConflito) return e.message;
  if (e instanceof ErroGit) return e.message;
  return "Falha inesperada ao falar com o GitHub.";
}
