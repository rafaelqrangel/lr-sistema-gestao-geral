/** Formatação de números e moeda (pt-BR). */

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const brlCentavos = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const num = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function fmtBRL(valor: number): string {
  return brl.format(valor);
}

export function fmtBRLCentavos(valor: number): string {
  return brlCentavos.format(valor);
}

export function fmtNum(valor: number): string {
  return num.format(valor);
}

/** Nota 1–5 com uma casa: "4,2". */
export function fmtNota(valor: number): string {
  return num.format(Math.round(valor * 10) / 10);
}

/** "1 dia" / "5 dias". */
export function fmtDias(n: number): string {
  return `${n} ${n === 1 ? "dia" : "dias"}`;
}

let contador = 0;

/** Id único, estável o suficiente para dados locais. */
export function novoId(prefixo: string): string {
  contador += 1;
  return `${prefixo}_${Date.now().toString(36)}${contador.toString(36)}`;
}
