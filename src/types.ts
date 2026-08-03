/**
 * Modelo de dados do Painel de Gestão.
 *
 * Três eixos: PESSOAS (quem), PROCESSOS (o que cada um roda) e
 * PERFORMANCE (como estão indo), mais a fila de APROVAÇÕES do gestor.
 */

export type Regime = "CLT" | "PJ" | "Estágio" | "Aprendiz" | "Terceiro";

export type StatusPessoa = "Ativo" | "Férias" | "Afastado" | "Desligado";

export type Nivel =
  | "Estagiário"
  | "Assistente"
  | "Analista Júnior"
  | "Analista Pleno"
  | "Analista Sênior"
  | "Especialista"
  | "Coordenador"
  | "Gerente";

export interface Pessoa {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  area: string;
  nivel: Nivel;
  regime: Regime;
  /** ISO date (YYYY-MM-DD) */
  dataAdmissao: string;
  /** Salário mensal bruto em BRL. */
  salario: number;
  /** Id do gestor direto (outra Pessoa). Vazio = reporta ao usuário do painel. */
  gestorId: string | null;
  status: StatusPessoa;
  /** Principais responsabilidades — o "pelo que ele responde". */
  atribuicoes: string[];
  observacoes: string;
}

// ---------------------------------------------------------------- Férias

export type StatusFerias = "Planejada" | "Aprovada" | "Gozada";

export interface Ferias {
  id: string;
  pessoaId: string;
  /** ISO date do primeiro dia de férias. */
  inicio: string;
  /** Quantidade de dias corridos. */
  dias: number;
  status: StatusFerias;
  /** Se o colaborador vendeu dias (abono pecuniário), quantos. */
  diasVendidos: number;
  observacao: string;
}

/** Situação consolidada do período aquisitivo vigente de uma pessoa. */
export interface SituacaoFerias {
  pessoaId: string;
  /** Início do período aquisitivo em curso (ISO). */
  aquisitivoInicio: string;
  /** Fim do período aquisitivo (ISO) — a partir daqui nasce o direito. */
  aquisitivoFim: string;
  /** Limite legal para gozo: aquisitivoFim + 12 meses. Depois disso, dobra. */
  limiteGozo: string;
  /** 30 dias, proporcional se ainda não completou o primeiro ano. */
  diasDireito: number;
  diasAgendados: number;
  diasGozados: number;
  diasVendidos: number;
  saldo: number;
  /** Dias corridos até o limite legal. Negativo = já venceu. */
  diasAteLimite: number;
  risco: RiscoFerias;
  /** True enquanto a pessoa não completou 12 meses de casa. */
  emAquisicao: boolean;
}

export type RiscoFerias = "Vencido" | "Crítico" | "Atenção" | "Em dia" | "Em aquisição";

// -------------------------------------------------------------- Processos

export type Frequencia =
  | "Diária"
  | "Semanal"
  | "Quinzenal"
  | "Mensal"
  | "Trimestral"
  | "Semestral"
  | "Anual"
  | "Sob demanda";

export type Criticidade = "Baixa" | "Média" | "Alta" | "Crítica";

export type StatusProcesso = "Em dia" | "Em risco" | "Atrasado" | "Parado";

export interface Processo {
  id: string;
  nome: string;
  area: string;
  descricao: string;
  /** Dono do processo — quem responde por ele. */
  donoId: string | null;
  /** Substituto/backup. Processo crítico sem backup é risco de continuidade. */
  backupId: string | null;
  frequencia: Frequencia;
  criticidade: Criticidade;
  /** O entregável concreto: "Relatório de sell-out consolidado". */
  entregavel: string;
  /** Prazo acordado, em texto livre: "todo dia 5", "D+2 do fechamento". */
  prazo: string;
  /** Indicador pelo qual o dono é cobrado. */
  indicador: string;
  /** Meta do indicador, em texto: "≥ 95%", "até 48h". */
  meta: string;
  status: StatusProcesso;
  /** ISO date da última execução registrada. */
  ultimaExecucao: string | null;
  /** Existe POP/documentação escrita? */
  documentado: boolean;
  /** Link para o documento, planilha ou pasta do processo. */
  link: string;
}

// ------------------------------------------------------------- Aprovações

export type TipoAprovacao =
  | "Viagem"
  | "Mobilidade (Uber/táxi)"
  | "Reembolso de despesa"
  | "Orçamento"
  | "Compra / Contrato"
  | "Hora extra"
  | "Desligamento / Contratação"
  | "Outro";

export type StatusAprovacao = "Pendente" | "Em análise" | "Aprovado" | "Reprovado";

export interface Aprovacao {
  id: string;
  tipo: TipoAprovacao;
  /** Quem pediu. */
  solicitanteId: string | null;
  descricao: string;
  valor: number;
  /** ISO date em que caiu na sua mesa. */
  dataSolicitacao: string;
  /** ISO date do prazo para você responder. */
  prazoResposta: string;
  status: StatusAprovacao;
  /** ISO date da sua decisão. */
  dataDecisao: string | null;
  centroCusto: string;
  /** Link para o comprovante, relatório ou anexo. */
  link: string;
  observacao: string;
  /**
   * Rotina recorrente: dias entre ocorrências (7 = semanal, ex.: revisão
   * do Uber Business). Ao decidir, a próxima ocorrência entra sozinha na
   * fila. 0 ou ausente = não repete.
   */
  recorrenciaDias?: number;
}

// ------------------------------------------------------------ Performance

/** Competências avaliadas, todas de 1 a 5. */
export interface Competencias {
  entrega: number;
  qualidade: number;
  colaboracao: number;
  autonomia: number;
  lideranca: number;
}

export const COMPETENCIA_LABELS: Record<keyof Competencias, string> = {
  entrega: "Entrega",
  qualidade: "Qualidade",
  colaboracao: "Colaboração",
  autonomia: "Autonomia",
  lideranca: "Liderança",
};

export interface Avaliacao {
  id: string;
  pessoaId: string;
  /** Ciclo de avaliação: "2026-S1", "2025-S2". */
  ciclo: string;
  competencias: Competencias;
  /** Atingimento de metas, 1 a 5. */
  resultado: number;
  /** Potencial percebido: 1 = baixo, 2 = médio, 3 = alto. Eixo Y do 9-box. */
  potencial: number;
  /** ISO date. */
  data: string;
  pontosFortes: string;
  pontosDesenvolver: string;
  planoAcao: string;
}

// ------------------------------------------------------------------ Banco

export interface Banco {
  versao: number;
  atualizadoEm: string;
  pessoas: Pessoa[];
  ferias: Ferias[];
  processos: Processo[];
  aprovacoes: Aprovacao[];
  avaliacoes: Avaliacao[];
}

export const VERSAO_BANCO = 1;

export const BANCO_VAZIO: Banco = {
  versao: VERSAO_BANCO,
  atualizadoEm: new Date().toISOString(),
  pessoas: [],
  ferias: [],
  processos: [],
  aprovacoes: [],
  avaliacoes: [],
};
