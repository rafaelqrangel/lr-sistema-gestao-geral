/**
 * Atas em Markdown.
 *
 * A ata é escrita no painel e materializada como arquivo .md — formato que
 * o GitHub versiona e renderiza, e que abre em qualquer editor. O mesmo
 * texto serve para baixar e enviar aos participantes.
 */

import type { Ata, Pessoa, Processo } from "../types";
import { fmtData } from "./datas";

/** "2026-08-03" + "reuniao-semanal" → "2026-08-03-reuniao-semanal.md" */
export function nomeArquivoAta(ata: Ata, processo: Processo | undefined): string {
  const base = (processo?.nome ?? ata.titulo ?? "ata")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${ata.data}-${base || "ata"}.md`;
}

/** Pasta da ata dentro do repositório: uma por processo. */
export function pastaDoProcesso(processo: Processo | undefined, processoId: string): string {
  const base = (processo?.nome ?? processoId)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || processoId;
}

function listaOuTraco(itens: string[]): string {
  return itens.length ? itens.map((i) => `- ${i}`).join("\n") : "- —";
}

/** Converte "o quê — quem — quando" por linha em checklist Markdown. */
function encaminhamentosMd(texto: string): string {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!linhas.length) return "- [ ] —";
  return linhas.map((l) => `- [ ] ${l}`).join("\n");
}

export function ataParaMarkdown(
  ata: Ata,
  processo: Processo | undefined,
  pessoas: Pessoa[],
): string {
  const nomeDe = (id: string) => pessoas.find((p) => p.id === id)?.nome ?? id;
  const participantes = [
    ...ata.participantesIds.map(nomeDe),
    ...ata.participantesExternos
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ];

  return `# ${ata.titulo || processo?.nome || "Ata de reunião"}

**Processo:** ${processo?.nome ?? "—"}
**Data:** ${fmtData(ata.data)}
**Área:** ${processo?.area ?? "—"}

## Participantes

${listaOuTraco(participantes)}

## Pauta

${ata.pauta.trim() || "—"}

## Decisões

${ata.decisoes.trim() || "—"}

## Encaminhamentos

${encaminhamentosMd(ata.encaminhamentos)}
${ata.observacoes.trim() ? `\n## Observações\n\n${ata.observacoes.trim()}\n` : ""}
---
Ata registrada no Painel de Gestão.
`;
}

/** Dispara o download do .md da ata no navegador. */
export function baixarAta(
  ata: Ata,
  processo: Processo | undefined,
  pessoas: Pessoa[],
): void {
  const conteudo = ataParaMarkdown(ata, processo, pessoas);
  const blob = new Blob([conteudo], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivoAta(ata, processo);
  a.click();
  URL.revokeObjectURL(url);
}

/** Texto pronto para colar no corpo do e-mail aos participantes. */
export function ataParaEmail(
  ata: Ata,
  processo: Processo | undefined,
  pessoas: Pessoa[],
): string {
  return ataParaMarkdown(ata, processo, pessoas)
    .replace(/^#+ /gm, "")
    .replace(/\*\*/g, "")
    .replace(/- \[ \] /g, "• ")
    .replace(/^- /gm, "• ");
}
