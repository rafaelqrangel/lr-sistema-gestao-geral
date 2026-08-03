/**
 * Persistência local + import/export.
 *
 * Os dados vivem no localStorage do navegador. O export JSON é o backup
 * completo; os exports CSV são pensados para virar fonte do Power BI
 * (um arquivo por entidade, separador ";" que o Excel pt-BR entende).
 */

import { BANCO_VAZIO, VERSAO_BANCO, type Banco } from "../types";

const CHAVE = "lr-gestao-v1";

export function carregarBanco(): Banco {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return structuredClone(BANCO_VAZIO);
    const dados = JSON.parse(bruto) as Banco;
    if (typeof dados !== "object" || !Array.isArray(dados.pessoas)) {
      return structuredClone(BANCO_VAZIO);
    }
    return { ...structuredClone(BANCO_VAZIO), ...dados, versao: VERSAO_BANCO };
  } catch {
    return structuredClone(BANCO_VAZIO);
  }
}

export function salvarBanco(banco: Banco): void {
  const comCarimbo = { ...banco, atualizadoEm: new Date().toISOString() };
  localStorage.setItem(CHAVE, JSON.stringify(comCarimbo));
}

export function limparBanco(): void {
  localStorage.removeItem(CHAVE);
}

// ------------------------------------------------------------------ Export

function baixarArquivo(nome: string, conteudo: string, tipo: string): void {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportarJSON(banco: Banco): void {
  const data = new Date().toISOString().slice(0, 10);
  baixarArquivo(
    `painel-gestao-backup-${data}.json`,
    JSON.stringify(banco, null, 2),
    "application/json",
  );
}

/**
 * CSV compatível com Excel pt-BR / Power BI: separador ";", BOM UTF-8 e
 * células com aspas quando necessário.
 */
function paraCSV(linhas: (string | number | boolean | null)[][]): string {
  const escapa = (v: string | number | boolean | null): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + linhas.map((l) => l.map(escapa).join(";")).join("\r\n");
}

export function exportarCSVs(banco: Banco): void {
  const data = new Date().toISOString().slice(0, 10);
  const nomeDe = (id: string | null) =>
    banco.pessoas.find((p) => p.id === id)?.nome ?? "";

  baixarArquivo(
    `pessoas-${data}.csv`,
    paraCSV([
      ["id", "nome", "email", "cargo", "area", "nivel", "regime", "data_admissao", "salario", "gestor", "status", "atribuicoes"],
      ...banco.pessoas.map((p) => [
        p.id, p.nome, p.email, p.cargo, p.area, p.nivel, p.regime,
        p.dataAdmissao, p.salario, nomeDe(p.gestorId), p.status,
        p.atribuicoes.join(" | "),
      ]),
    ]),
    "text/csv",
  );

  baixarArquivo(
    `ferias-${data}.csv`,
    paraCSV([
      ["id", "pessoa", "inicio", "dias", "dias_vendidos", "status", "observacao"],
      ...banco.ferias.map((f) => [
        f.id, nomeDe(f.pessoaId), f.inicio, f.dias, f.diasVendidos, f.status, f.observacao,
      ]),
    ]),
    "text/csv",
  );

  baixarArquivo(
    `processos-${data}.csv`,
    paraCSV([
      ["id", "nome", "area", "dono", "backup", "frequencia", "criticidade", "entregavel", "prazo", "indicador", "meta", "status", "ultima_execucao", "documentado"],
      ...banco.processos.map((p) => [
        p.id, p.nome, p.area, nomeDe(p.donoId), nomeDe(p.backupId),
        p.frequencia, p.criticidade, p.entregavel, p.prazo, p.indicador,
        p.meta, p.status, p.ultimaExecucao, p.documentado,
      ]),
    ]),
    "text/csv",
  );

  baixarArquivo(
    `aprovacoes-${data}.csv`,
    paraCSV([
      ["id", "tipo", "solicitante", "descricao", "valor", "data_solicitacao", "prazo_resposta", "status", "data_decisao", "centro_custo"],
      ...banco.aprovacoes.map((a) => [
        a.id, a.tipo, nomeDe(a.solicitanteId), a.descricao, a.valor,
        a.dataSolicitacao, a.prazoResposta, a.status, a.dataDecisao, a.centroCusto,
      ]),
    ]),
    "text/csv",
  );

  baixarArquivo(
    `avaliacoes-${data}.csv`,
    paraCSV([
      ["id", "pessoa", "ciclo", "data", "entrega", "qualidade", "colaboracao", "autonomia", "lideranca", "resultado", "potencial", "pontos_fortes", "pontos_desenvolver"],
      ...banco.avaliacoes.map((a) => [
        a.id, nomeDe(a.pessoaId), a.ciclo, a.data,
        a.competencias.entrega, a.competencias.qualidade, a.competencias.colaboracao,
        a.competencias.autonomia, a.competencias.lideranca,
        a.resultado, a.potencial, a.pontosFortes, a.pontosDesenvolver,
      ]),
    ]),
    "text/csv",
  );
}

// ------------------------------------------------------------------ Import

export function importarJSON(arquivo: File): Promise<Banco> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    leitor.onload = () => {
      try {
        const dados = JSON.parse(String(leitor.result)) as Banco;
        if (!Array.isArray(dados.pessoas) || !Array.isArray(dados.processos)) {
          throw new Error("Arquivo não parece um backup do painel.");
        }
        resolve({ ...structuredClone(BANCO_VAZIO), ...dados, versao: VERSAO_BANCO });
      } catch (e) {
        reject(e instanceof Error ? e : new Error("JSON inválido."));
      }
    };
    leitor.readAsText(arquivo);
  });
}
