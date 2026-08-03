/**
 * Agenda consolidada.
 *
 * O calendário não guarda dados próprios além dos eventos avulsos: ele
 * projeta o que já existe — ocorrências de processos recorrentes, férias
 * da equipe, viagens aprovadas e prazos de decisão — numa única grade.
 */

import type {
  Aprovacao,
  Banco,
  ItemAgenda,
  Processo,
} from "../types";
import { DIAS_POR_FREQUENCIA } from "../types";
import { diasEntre, fimDoPeriodo, hojeISO, paraData, paraISO, somarDias } from "./datas";

/** Primeiro e último dia (ISO) da grade mensal, incluindo a borda. */
export function limitesDoMes(ano: number, mes: number): { inicio: string; fim: string } {
  return {
    inicio: paraISO(new Date(ano, mes, 1)),
    fim: paraISO(new Date(ano, mes + 1, 0)),
  };
}

/**
 * Projeta as ocorrências de um processo recorrente dentro da janela.
 * Ancorada em `proximaExecucao`; retrocede e avança pelo passo da
 * frequência. Processos "Sob demanda" rendem no máximo a data marcada.
 */
export function ocorrenciasDoProcesso(
  processo: Processo,
  inicioJanela: string,
  fimJanela: string,
  limite = 60,
): string[] {
  if (!processo.proximaExecucao) return [];
  const passo = DIAS_POR_FREQUENCIA[processo.frequencia];
  if (passo <= 0) {
    const d = processo.proximaExecucao;
    return diasEntre(inicioJanela, d) >= 0 && diasEntre(d, fimJanela) >= 0 ? [d] : [];
  }

  // Recua da âncora até antes do início da janela, depois avança.
  const recuos = Math.ceil(diasEntre(inicioJanela, processo.proximaExecucao) / passo);
  let atual = somarDias(processo.proximaExecucao, -Math.max(0, recuos) * passo);
  const datas: string[] = [];
  for (let i = 0; i < limite; i += 1) {
    if (diasEntre(atual, fimJanela) < 0) break;
    if (diasEntre(inicioJanela, atual) >= 0) datas.push(atual);
    atual = somarDias(atual, passo);
  }
  return datas;
}

/** Viagem aprovada vira bloco na agenda quando o período está na observação. */
function periodoDaViagem(a: Aprovacao): { inicio: string; fim: string } | null {
  const m = a.observacao.match(
    /(\d{2})\/(\d{2})\/(\d{4})\s*a\s*(\d{2})\/(\d{2})\/(\d{4})/i,
  );
  if (!m) return null;
  return {
    inicio: `${m[3]}-${m[2]}-${m[1]}`,
    fim: `${m[6]}-${m[5]}-${m[4]}`,
  };
}

/** Todos os itens que caem na janela [inicio, fim]. */
export function itensDaAgenda(
  banco: Banco,
  inicio: string,
  fim: string,
): ItemAgenda[] {
  const itens: ItemAgenda[] = [];
  const nomeDe = (id: string | null) =>
    banco.pessoas.find((p) => p.id === id)?.nome ?? "—";

  for (const p of banco.processos) {
    if (p.status === "Parado") continue;
    // A busca recua o tamanho do prazo: uma ocorrência do mês anterior pode
    // ter o prazo final caindo dentro desta janela.
    const inicioBusca = somarDias(inicio, -Math.max(0, p.diasParaPrazo));
    for (const data of ocorrenciasDoProcesso(p, inicioBusca, fim)) {
      if (diasEntre(inicio, data) >= 0) {
        itens.push({
          id: `pr_${p.id}_${data}`,
          origem: "processo",
          titulo: p.nome,
          detalhe: `${p.frequencia} · dono: ${nomeDe(p.donoId)}`,
          inicio: data,
          fim: data,
          tom: "processo",
          horario: p.horario,
        });
      }
      if (p.diasParaPrazo > 0) {
        const prazo = somarDias(data, p.diasParaPrazo);
        if (diasEntre(inicio, prazo) >= 0 && diasEntre(prazo, fim) >= 0) {
          itens.push({
            id: `pz_${p.id}_${data}`,
            origem: "processo",
            titulo: `Prazo final: ${p.nome}`,
            detalhe: p.entregavel || "Entrega do processo",
            inicio: prazo,
            fim: prazo,
            tom: "prazo",
            horario: "",
          });
        }
      }
    }
  }

  for (const f of banco.ferias) {
    const fimF = fimDoPeriodo(f.inicio, f.dias);
    if (diasEntre(f.inicio, fim) < 0 || diasEntre(inicio, fimF) < 0) continue;
    itens.push({
      id: `fe_${f.id}`,
      origem: "ferias",
      titulo: `Férias — ${nomeDe(f.pessoaId)}`,
      detalhe: f.substitutoId
        ? `Substituto: ${nomeDe(f.substitutoId)}`
        : "Sem substituto formal definido",
      inicio: f.inicio,
      fim: fimF,
      tom: "ferias",
      horario: "",
    });
  }

  for (const a of banco.aprovacoes) {
    if (a.tipo !== "Viagem") continue;
    const periodo = periodoDaViagem(a);
    if (!periodo) continue;
    if (diasEntre(periodo.inicio, fim) < 0 || diasEntre(inicio, periodo.fim) < 0) continue;
    itens.push({
      id: `vi_${a.id}`,
      origem: "aprovacao",
      titulo: `Viagem — ${nomeDe(a.solicitanteId)}`,
      detalhe: `${a.descricao} · ${a.status}`,
      inicio: periodo.inicio,
      fim: periodo.fim,
      tom: "viagem",
      horario: "",
    });
  }

  for (const e of banco.eventos) {
    if (diasEntre(e.inicio, fim) < 0 || diasEntre(inicio, e.fim) < 0) continue;
    itens.push({
      id: `ev_${e.id}`,
      origem: "evento",
      titulo: e.titulo,
      detalhe: [e.tipo, e.local].filter(Boolean).join(" · "),
      inicio: e.inicio,
      fim: e.fim,
      tom: e.tipo === "Viagem" ? "viagem" : "evento",
      horario: "",
    });
  }

  return itens.sort(
    (a, b) => a.inicio.localeCompare(b.inicio) || a.horario.localeCompare(b.horario),
  );
}

/** Itens que ocupam um dia específico (blocos multi-dia incluídos). */
export function itensDoDia(itens: ItemAgenda[], dia: string): ItemAgenda[] {
  return itens.filter(
    (i) => diasEntre(i.inicio, dia) >= 0 && diasEntre(dia, i.fim) >= 0,
  );
}

/** Semanas do mês, cada uma com 7 dias ISO — segunda a domingo. */
export function gradeDoMes(ano: number, mes: number): string[][] {
  const primeiro = new Date(ano, mes, 1);
  // getDay(): 0 = domingo. A grade começa na segunda.
  const desloca = (primeiro.getDay() + 6) % 7;
  const inicio = somarDias(paraISO(primeiro), -desloca);
  const semanas: string[][] = [];
  let cursor = inicio;
  for (let s = 0; s < 6; s += 1) {
    const semana: string[] = [];
    for (let d = 0; d < 7; d += 1) {
      semana.push(cursor);
      cursor = somarDias(cursor, 1);
    }
    semanas.push(semana);
    // Para de gerar quando a semana seguinte já saiu do mês.
    if (paraData(cursor).getMonth() !== mes) break;
  }
  return semanas;
}

// ------------------------------------------------------------- Lembretes

export interface Lembrete {
  processo: Processo;
  data: string;
  diasAte: number;
  /** Data-limite de conclusão desta ocorrência. */
  prazoFinal: string;
  atrasado: boolean;
}

/**
 * Processos cuja próxima ocorrência já entrou na janela de aviso — ou
 * cujo prazo final já passou sem execução registrada.
 */
export function lembretesPendentes(
  processos: Processo[],
  referencia: string = hojeISO(),
): Lembrete[] {
  const lembretes: Lembrete[] = [];
  for (const p of processos) {
    if (!p.proximaExecucao || p.status === "Parado") continue;
    const diasAte = diasEntre(referencia, p.proximaExecucao);
    const prazoFinal = somarDias(p.proximaExecucao, p.diasParaPrazo);
    const atrasado = diasEntre(prazoFinal, referencia) > 0;
    if (diasAte <= p.lembreteDiasAntes || atrasado) {
      lembretes.push({ processo: p, data: p.proximaExecucao, diasAte, prazoFinal, atrasado });
    }
  }
  return lembretes.sort((a, b) => a.data.localeCompare(b.data));
}

/**
 * Avança a âncora de um processo para a próxima ocorrência, registrando a
 * execução. Usada quando o gestor marca "executado".
 *
 * A ocorrência marcada é sempre consumida — mesmo adiantada, executar
 * significa que aquela rodada acabou. Depois disso, pula quantas forem
 * necessárias para a âncora cair no futuro (rotina que ficou parada por
 * semanas não deve reaparecer com data vencida).
 */
export function avancarProcesso(p: Processo, referencia: string = hojeISO()): Processo {
  const passo = DIAS_POR_FREQUENCIA[p.frequencia];
  if (passo <= 0) {
    return { ...p, ultimaExecucao: referencia, proximaExecucao: null };
  }
  let proxima = somarDias(p.proximaExecucao ?? referencia, passo);
  while (diasEntre(referencia, proxima) <= 0) proxima = somarDias(proxima, passo);
  return { ...p, ultimaExecucao: referencia, proximaExecucao: proxima };
}
