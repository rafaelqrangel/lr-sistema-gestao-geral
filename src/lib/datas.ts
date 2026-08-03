/**
 * Utilitários de data.
 *
 * Convenção: datas de negócio trafegam como string ISO "YYYY-MM-DD" e são
 * sempre interpretadas no fuso local. Usar `new Date("2026-01-15")` seria
 * um bug silencioso: o JS lê como UTC e, num navegador em UTC-3, o dia
 * volta para 14. Por isso todo parsing passa por `paraData`.
 */

/** Converte "YYYY-MM-DD" em Date local (meia-noite). */
export function paraData(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

/** Converte Date em "YYYY-MM-DD" usando os componentes locais. */
export function paraISO(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function hojeISO(): string {
  return paraISO(new Date());
}

export function somarDias(iso: string, dias: number): string {
  const d = paraData(iso);
  d.setDate(d.getDate() + dias);
  return paraISO(d);
}

/**
 * Soma meses preservando o "mesmo dia do mês". Quando o dia não existe no
 * mês de destino (31 de janeiro + 1 mês), cai no último dia do mês —
 * comportamento esperado para contagem de períodos aquisitivos.
 */
export function somarMeses(iso: string, meses: number): string {
  const d = paraData(iso);
  const diaOriginal = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + meses);
  const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(diaOriginal, ultimoDia));
  return paraISO(d);
}

/** Diferença em dias corridos (b - a). Positivo se `b` é depois de `a`. */
export function diasEntre(a: string, b: string): number {
  const MS_DIA = 86_400_000;
  // Normaliza para meio-dia para neutralizar horário de verão.
  const da = paraData(a).setHours(12, 0, 0, 0);
  const db = paraData(b).setHours(12, 0, 0, 0);
  return Math.round((db - da) / MS_DIA);
}

/** Meses completos entre duas datas (aniversário do dia precisa ter passado). */
export function mesesEntre(a: string, b: string): number {
  const da = paraData(a);
  const db = paraData(b);
  let meses = (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth());
  if (db.getDate() < da.getDate()) meses -= 1;
  return meses;
}

/** Último dia coberto por um período de férias que começa em `inicio`. */
export function fimDoPeriodo(inicio: string, dias: number): string {
  return somarDias(inicio, Math.max(1, dias) - 1);
}

/** Dois intervalos [aIni,aFim] e [bIni,bFim] se sobrepõem? */
export function sobrepoe(aIni: string, aFim: string, bIni: string, bFim: string): boolean {
  return diasEntre(aIni, bFim) >= 0 && diasEntre(bIni, aFim) >= 0;
}

const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export const MESES_LONGOS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** "2026-03-05" → "05/03/2026" */
export function fmtData(iso: string | null): string {
  if (!iso) return "—";
  const d = paraData(iso);
  return d.toLocaleDateString("pt-BR");
}

/** "2026-03-05" → "05 mar 2026" */
export function fmtDataCurta(iso: string | null): string {
  if (!iso) return "—";
  const d = paraData(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MESES_CURTOS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Texto relativo ao hoje: "em 12 dias", "há 3 dias", "hoje". */
export function fmtPrazo(iso: string | null): string {
  if (!iso) return "—";
  const d = diasEntre(hojeISO(), iso);
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  if (d === -1) return "ontem";
  if (d > 0) return `em ${d} dias`;
  return `há ${Math.abs(d)} dias`;
}
