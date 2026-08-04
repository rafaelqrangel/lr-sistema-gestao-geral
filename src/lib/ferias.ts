/**
 * Regras de férias (CLT) usadas pelo painel.
 *
 * O que a lei diz, em resumo:
 *  - A cada 12 meses trabalhados o colaborador completa um PERÍODO
 *    AQUISITIVO e ganha direito a 30 dias de férias.
 *  - A empresa tem os 12 meses seguintes (PERÍODO CONCESSIVO) para conceder
 *    essas férias. Passou disso, paga em dobro (art. 137).
 *  - As férias podem ser fracionadas em até 3 períodos, sendo um deles de no
 *    mínimo 14 dias e os demais de no mínimo 5 dias (art. 134, §1º).
 *  - Até 1/3 pode ser convertido em abono pecuniário (venda de até 10 dias).
 *
 * Simplificações assumidas nesta versão:
 *  - Direito fixo de 30 dias por período. A redução por faltas
 *    injustificadas (art. 130) não é modelada.
 *  - O consumo de dias é alocado nos períodos aquisitivos em ordem
 *    cronológica (FIFO), que é como o direito mais antigo é quitado primeiro.
 *  - Férias "Planejada" e "Aprovada" já abatem do saldo, para o gestor
 *    enxergar o compromisso e não só o passado.
 */

import type {
  Cargo,
  ConflitoFerias,
  Ferias,
  Pessoa,
  RegraBloqueio,
  RiscoFerias,
  SituacaoFerias,
} from "../types";
import { diasEntre, fimDoPeriodo, hojeISO, mesesEntre, somarMeses, sobrepoe } from "./datas";

export const DIAS_POR_PERIODO = 30;
export const MAX_DIAS_VENDIDOS = 10;
/** Faltando isso ou menos para o limite legal, vira crítico. */
export const LIMIAR_CRITICO = 30;
export const LIMIAR_ATENCAO = 90;

interface PeriodoAquisitivo {
  inicio: string;
  fim: string;
  limiteGozo: string;
  direito: number;
  consumido: number;
}

/** Constrói os períodos aquisitivos já completos até `referencia`. */
function periodosCompletos(dataAdmissao: string, referencia: string): PeriodoAquisitivo[] {
  const meses = mesesEntre(dataAdmissao, referencia);
  const ciclos = Math.floor(meses / 12);
  const periodos: PeriodoAquisitivo[] = [];
  for (let i = 0; i < ciclos; i++) {
    const fim = somarMeses(dataAdmissao, (i + 1) * 12);
    periodos.push({
      inicio: somarMeses(dataAdmissao, i * 12),
      fim,
      limiteGozo: somarMeses(fim, 12),
      direito: DIAS_POR_PERIODO,
      consumido: 0,
    });
  }
  return periodos;
}

export function classificarRisco(diasAteLimite: number, emAquisicao: boolean): RiscoFerias {
  if (emAquisicao) return "Em aquisição";
  if (diasAteLimite < 0) return "Vencido";
  if (diasAteLimite <= LIMIAR_CRITICO) return "Crítico";
  if (diasAteLimite <= LIMIAR_ATENCAO) return "Atenção";
  return "Em dia";
}

/**
 * Consolida a situação de férias de uma pessoa.
 *
 * Reporta o período aquisitivo mais antigo que ainda tem saldo — é ele que
 * define o risco real. Se todos estão quitados, reporta o período em
 * aquisição (ou o último fechado, para quem acabou de zerar).
 */
export function situacaoFerias(
  pessoa: Pessoa,
  feriasDaPessoa: Ferias[],
  referencia: string = hojeISO(),
): SituacaoFerias {
  const periodos = periodosCompletos(pessoa.dataAdmissao, referencia);

  const ordenadas = [...feriasDaPessoa].sort((a, b) => a.inicio.localeCompare(b.inicio));
  let diasAgendados = 0; // Planejada + Aprovada
  let diasGozados = 0;
  let diasVendidos = 0;
  for (const f of ordenadas) {
    if (f.status === "Gozada") diasGozados += f.dias;
    else diasAgendados += f.dias;
    diasVendidos += f.diasVendidos;
  }

  // Aloca o consumo total nos períodos, do mais antigo para o mais novo.
  let aAlocar = diasGozados + diasAgendados + diasVendidos;
  for (const p of periodos) {
    const usa = Math.min(p.direito, aAlocar);
    p.consumido = usa;
    aAlocar -= usa;
  }

  const comSaldo = periodos.find((p) => p.consumido < p.direito);
  const mesesDeCasa = mesesEntre(pessoa.dataAdmissao, referencia);

  if (comSaldo) {
    const diasAteLimite = diasEntre(referencia, comSaldo.limiteGozo);
    return {
      pessoaId: pessoa.id,
      aquisitivoInicio: comSaldo.inicio,
      aquisitivoFim: comSaldo.fim,
      limiteGozo: comSaldo.limiteGozo,
      diasDireito: comSaldo.direito,
      diasAgendados,
      diasGozados,
      diasVendidos,
      saldo: comSaldo.direito - comSaldo.consumido,
      diasAteLimite,
      risco: classificarRisco(diasAteLimite, false),
      emAquisicao: false,
    };
  }

  // Nenhum período fechado com saldo: está acumulando o próximo direito.
  const ciclosFechados = periodos.length;
  const inicio = somarMeses(pessoa.dataAdmissao, ciclosFechados * 12);
  const fim = somarMeses(pessoa.dataAdmissao, (ciclosFechados + 1) * 12);
  const limiteGozo = somarMeses(fim, 12);
  const mesesNoCiclo = mesesDeCasa - ciclosFechados * 12;
  const proporcional = Math.floor(mesesNoCiclo * (DIAS_POR_PERIODO / 12));

  return {
    pessoaId: pessoa.id,
    aquisitivoInicio: inicio,
    aquisitivoFim: fim,
    limiteGozo,
    diasDireito: proporcional,
    diasAgendados,
    diasGozados,
    diasVendidos,
    saldo: 0,
    diasAteLimite: diasEntre(referencia, limiteGozo),
    risco: "Em aquisição",
    emAquisicao: true,
  };
}

export const ORDEM_RISCO: Record<RiscoFerias, number> = {
  Vencido: 0,
  Crítico: 1,
  Atenção: 2,
  "Em dia": 3,
  "Em aquisição": 4,
};

/**
 * Valida o fracionamento de um conjunto de férias dentro de um mesmo
 * período aquisitivo. Retorna a lista de problemas encontrados (vazia = ok).
 */
export function validarFracionamento(dias: number[]): string[] {
  const problemas: string[] = [];
  const periodos = dias.filter((d) => d > 0);
  if (periodos.length === 0) return problemas;
  if (periodos.length > 3) {
    problemas.push("Férias fracionadas em mais de 3 períodos (art. 134, §1º).");
  }
  if (periodos.length > 1) {
    if (!periodos.some((d) => d >= 14)) {
      problemas.push("Ao fracionar, um dos períodos precisa ter no mínimo 14 dias.");
    }
    if (periodos.some((d) => d < 5)) {
      problemas.push("Nenhum período fracionado pode ter menos de 5 dias.");
    }
  }
  return problemas;
}

// ------------------------------------------------------ Regras de bloqueio

/** O texto do alvo aparece na área da pessoa ou no nome do cargo dela? */
function casaAlvo(
  alvo: string,
  pessoa: Pessoa,
  cargo: Cargo | undefined,
): boolean {
  const chave = alvo.trim().toLowerCase();
  if (!chave) return false;
  const campos = [pessoa.area, cargo?.nome ?? "", cargo?.area ?? ""];
  return campos.some((c) => c.toLowerCase().includes(chave));
}

/**
 * Detecta ausências simultâneas que violam as regras de bloqueio.
 *
 * Uma regra é violada quando, numa mesma janela, o número de pessoas do
 * alvo ausentes ao mesmo tempo excede `maximoSimultaneo`. A comparação é
 * feita par a par: basta uma sobreposição para o conflito existir, e o
 * intervalo reportado é a interseção — que é o período a renegociar.
 */
export function detectarConflitos(
  ferias: Ferias[],
  pessoas: Pessoa[],
  cargos: Cargo[],
  regras: RegraBloqueio[],
): ConflitoFerias[] {
  const pessoaPorId = new Map(pessoas.map((p) => [p.id, p]));
  const cargoPorId = new Map(cargos.map((c) => [c.id, c]));
  const conflitos: ConflitoFerias[] = [];

  for (const regra of regras.filter((r) => r.ativa)) {
    const relevantes = ferias.filter((f) => {
      if (f.status === "Gozada") return false;
      const p = pessoaPorId.get(f.pessoaId);
      if (!p) return false;
      return casaAlvo(regra.alvo, p, cargoPorId.get(p.cargoId ?? ""));
    });

    for (let i = 0; i < relevantes.length; i += 1) {
      for (let j = i + 1; j < relevantes.length; j += 1) {
        const a = relevantes[i];
        const b = relevantes[j];
        if (a.pessoaId === b.pessoaId) continue;
        const fimA = fimDoPeriodo(a.inicio, a.dias);
        const fimB = fimDoPeriodo(b.inicio, b.dias);
        if (!sobrepoe(a.inicio, fimA, b.inicio, fimB)) continue;
        // Duas ausências simultâneas cabem quando a regra permite 2+.
        if (regra.maximoSimultaneo >= 2) continue;
        conflitos.push({
          regra,
          feriasIds: [a.id, b.id],
          pessoas: [
            pessoaPorId.get(a.pessoaId)?.nome ?? "—",
            pessoaPorId.get(b.pessoaId)?.nome ?? "—",
          ],
          inicio: a.inicio > b.inicio ? a.inicio : b.inicio,
          fim: fimA < fimB ? fimA : fimB,
        });
      }
    }
  }
  return conflitos;
}
