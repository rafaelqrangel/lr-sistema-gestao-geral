/**
 * Persistência local + import/export.
 *
 * Os dados vivem no localStorage do navegador. O export JSON é o backup
 * completo; os exports CSV são pensados para virar fonte do Power BI
 * (um arquivo por entidade, separador ";" que o Excel pt-BR entende).
 */

import { BANCO_VAZIO, chaveCargo, VERSAO_BANCO, type Banco } from "../types";
import { migrar } from "./migracao";

const CHAVE = "lr-gestao-v1";

export function carregarBanco(): Banco {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return structuredClone(BANCO_VAZIO);
    return migrar(JSON.parse(bruto));
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

/** JSON canônico do banco — o mesmo texto vai para o backup e para o Git. */
export function serializar(banco: Banco): string {
  return JSON.stringify({ ...banco, versao: VERSAO_BANCO }, null, 2);
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
    serializar(banco),
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
  const cargoDe = (id: string | null) => {
    const c = banco.cargos.find((x) => x.id === id);
    return c ? chaveCargo(c) : "";
  };

  baixarArquivo(
    `cargos-${data}.csv`,
    paraCSV([
      ["id", "chave", "cargo", "nivel", "area", "nivel_hierarquico", "proposito", "atribuicoes", "entregaveis", "reporta_a", "interfaces", "alcada", "requisitos", "vinculo"],
      ...banco.cargos.map((c) => [
        c.id, chaveCargo(c), c.nome, c.nivel, c.area, c.nivelHierarquico,
        c.proposito, c.atribuicoes.join(" | "), c.entregaveis.join(" | "),
        cargoDe(c.reportaAId), c.interfaces.join(" | "), c.alcada, c.requisitos, c.vinculo,
      ]),
    ]),
    "text/csv",
  );

  baixarArquivo(
    `quadro-pessoal-${data}.csv`,
    paraCSV([
      ["id", "nome", "email", "cargo", "area", "vinculo", "data_admissao", "salario", "modelo_variavel", "gestor", "substituto", "trilha_eixo", "status", "atribuicoes"],
      ...banco.pessoas.map((p) => [
        p.id, p.nome, p.email, cargoDe(p.cargoId), p.area, p.regime,
        p.dataAdmissao, p.salario, p.modeloVariavel, nomeDe(p.gestorId),
        nomeDe(p.substitutoId), p.trilhaEixo ?? "", p.status,
        p.atribuicoes.join(" | "),
      ]),
    ]),
    "text/csv",
  );

  baixarArquivo(
    `faixas-salariais-${data}.csv`,
    paraCSV([
      ["id", "cargo", "minimo", "medio", "maximo", "ocupantes", "media_praticada", "referencia"],
      ...banco.faixas.map((f) => {
        const ocupantes = banco.pessoas.filter(
          (p) => p.cargoId === f.cargoId && p.status !== "Desligado",
        );
        const comSalario = ocupantes.filter((p) => p.salario > 0);
        const media = comSalario.length
          ? comSalario.reduce((s, p) => s + p.salario, 0) / comSalario.length
          : "";
        return [
          f.id, cargoDe(f.cargoId), f.minimo, f.medio, f.maximo,
          ocupantes.length, media, f.referencia,
        ];
      }),
    ]),
    "text/csv",
  );

  baixarArquivo(
    `ferias-${data}.csv`,
    paraCSV([
      ["id", "pessoa", "inicio", "dias", "dias_vendidos", "status", "substituto", "alcada_substituto", "escalona_para", "observacao"],
      ...banco.ferias.map((f) => [
        f.id, nomeDe(f.pessoaId), f.inicio, f.dias, f.diasVendidos, f.status,
        nomeDe(f.substitutoId), f.alcadaSubstituto, nomeDe(f.escalonaParaId),
        f.observacao,
      ]),
    ]),
    "text/csv",
  );

  baixarArquivo(
    `processos-${data}.csv`,
    paraCSV([
      ["id", "nome", "area", "dono", "backup", "frequencia", "criticidade", "entregavel", "prazo", "indicador", "meta", "status", "ultima_execucao", "proxima_execucao", "horario", "dias_para_prazo", "documentado"],
      ...banco.processos.map((p) => [
        p.id, p.nome, p.area, nomeDe(p.donoId), nomeDe(p.backupId),
        p.frequencia, p.criticidade, p.entregavel, p.prazo, p.indicador,
        p.meta, p.status, p.ultimaExecucao, p.proximaExecucao, p.horario,
        p.diasParaPrazo, p.documentado,
      ]),
    ]),
    "text/csv",
  );

  baixarArquivo(
    `kpis-${data}.csv`,
    paraCSV([
      ["id", "cargo", "kpi", "definicao", "fonte", "meta", "periodicidade", "controla_alavanca", "uso_permitido", "peso", "observacao"],
      ...banco.kpis.map((k) => [
        k.id, cargoDe(k.cargoId), k.nome, k.definicao, k.fonte, k.meta,
        k.periodicidade, k.controla, k.uso, k.peso, k.observacao,
      ]),
    ]),
    "text/csv",
  );

  baixarArquivo(
    `atas-${data}.csv`,
    paraCSV([
      ["id", "processo", "data", "titulo", "participantes", "decisoes", "encaminhamentos"],
      ...banco.atas.map((a) => [
        a.id,
        banco.processos.find((p) => p.id === a.processoId)?.nome ?? "",
        a.data, a.titulo,
        a.participantesIds.map(nomeDe).join(" | "),
        a.decisoes, a.encaminhamentos,
      ]),
    ]),
    "text/csv",
  );

  baixarArquivo(
    `aprovacoes-${data}.csv`,
    paraCSV([
      ["id", "tipo", "solicitante", "descricao", "valor", "data_solicitacao", "prazo_resposta", "status", "data_decisao", "centro_custo", "recorrencia_dias", "link"],
      ...banco.aprovacoes.map((a) => [
        a.id, a.tipo, nomeDe(a.solicitanteId), a.descricao, a.valor,
        a.dataSolicitacao, a.prazoResposta, a.status, a.dataDecisao, a.centroCusto,
        a.recorrenciaDias ?? 0, a.link,
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
        const dados = JSON.parse(String(leitor.result));
        if (!Array.isArray(dados?.pessoas)) {
          throw new Error("Arquivo não parece um backup do painel.");
        }
        resolve(migrar(dados));
      } catch (e) {
        reject(e instanceof Error ? e : new Error("JSON inválido."));
      }
    };
    leitor.readAsText(arquivo);
  });
}
