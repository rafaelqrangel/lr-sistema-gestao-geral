/**
 * Modelo de dados do Painel de Gestão.
 *
 * PRINCÍPIO ESTRUTURAL: cargo e pessoa são entidades separadas. O cargo
 * existe independente de quem o ocupa — carrega propósito, atribuições,
 * faixa salarial e KPIs. A pessoa ocupa um cargo em um nível. Sem essa
 * separação não há faixa salarial, não há promoção sem troca de cargo e
 * não há comparação de equidade interna.
 *
 * CARGOS é a tabela-mãe: FAIXAS, KPIS e QUADRO DE PESSOAL a referenciam.
 */

export type Regime = "CLT" | "PJ" | "Estágio" | "Aprendiz" | "Terceiro" | "PJ / Representação";

export type StatusPessoa = "Ativo" | "Férias" | "Afastado" | "Desligado";

/** Eixo de progressão. Técnico e gestão são caminhos distintos e de mesmo valor. */
export type EixoTrilha = "Técnico" | "Gestão";

// ---------------------------------------------------------------- Cargos

/** Nível dentro do cargo. "Único" para cargos sem gradação. */
export type NivelCargo = "Único" | "Júnior" | "Pleno" | "Sênior" | "Especialista" | "I" | "II" | "III";

export const NIVEIS_CARGO: NivelCargo[] = [
  "Único", "Júnior", "Pleno", "Sênior", "Especialista", "I", "II", "III",
];

/** Camada hierárquica, usada para ordenar o organograma. */
export type NivelHierarquico =
  | "1 - Diretoria"
  | "2 - Gerência"
  | "3 - Coordenação"
  | "4 - Analista"
  | "5 - Assistente"
  | "6 - Representação";

export const NIVEIS_HIERARQUICOS: NivelHierarquico[] = [
  "1 - Diretoria", "2 - Gerência", "3 - Coordenação",
  "4 - Analista", "5 - Assistente", "6 - Representação",
];

/**
 * Um cargo em um nível. "Gerente Regional | Sênior" e "| Pleno" são cargos
 * distintos, com faixa salarial própria.
 */
export interface Cargo {
  id: string;
  nome: string;
  nivel: NivelCargo;
  area: string;
  nivelHierarquico: NivelHierarquico;
  /** Por que a posição existe. */
  proposito: string;
  atribuicoes: string[];
  entregaveis: string[];
  /** Id do cargo imediatamente superior. */
  reportaAId: string | null;
  interfaces: string[];
  /** O que o ocupante pode decidir sozinho — e a partir de onde escalona. */
  alcada: string;
  requisitos: string;
  vinculo: Regime;
}

/** "Gerente Regional de Vendas | Sênior" — chave legível do cargo. */
export function chaveCargo(c: Cargo): string {
  return `${c.nome} | ${c.nivel}`;
}

// ------------------------------------------------------- Faixa salarial

/**
 * Faixa por cargo. ACESSO RESTRITO: faixas podem ser publicadas ao time;
 * salários individuais, não.
 */
export interface Faixa {
  id: string;
  cargoId: string;
  minimo: number;
  medio: number;
  maximo: number;
  /** Benchmark usado para calibrar a faixa. */
  referencia: string;
}

/** Posição do salário dentro da faixa, em %. 0 = piso, 100 = teto. */
export function posicaoNaFaixa(salario: number, faixa: Faixa): number | null {
  if (!faixa.minimo || !faixa.maximo || faixa.maximo <= faixa.minimo) return null;
  return ((salario - faixa.minimo) / (faixa.maximo - faixa.minimo)) * 100;
}

/** Amplitude saudável fica entre 30% e 50%. */
export function amplitudeFaixa(faixa: Faixa): number | null {
  if (!faixa.minimo || !faixa.maximo) return null;
  return ((faixa.maximo - faixa.minimo) / faixa.minimo) * 100;
}

// --------------------------------------------------------------- Pessoas

export interface Pessoa {
  id: string;
  nome: string;
  email: string;
  /** Cargo ocupado. Null enquanto não classificado. */
  cargoId: string | null;
  /** Área específica, quando difere da área do cargo (ex.: regional NORDESTE). */
  area: string;
  regime: Regime;
  /** ISO date (YYYY-MM-DD) */
  dataAdmissao: string;
  /** Salário mensal bruto em BRL. */
  salario: number;
  /** Modelo de remuneração variável, em texto: "3 salários/ano por atingimento". */
  modeloVariavel: string;
  /** Id do gestor direto (outra Pessoa). Vazio = reporta ao usuário do painel. */
  gestorId: string | null;
  /** Quem assume formalmente na ausência. */
  substitutoId: string | null;
  trilhaEixo: EixoTrilha | null;
  status: StatusPessoa;
  /** Atribuições específicas desta pessoa, além das do cargo. */
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
  /**
   * Quem assume formalmente. O campo decisivo da programação não é a data:
   * é o substituto e a alçada que ele recebe.
   */
  substitutoId: string | null;
  /** O que o substituto pode decidir — e o que não pode. */
  alcadaSubstituto: string;
  /** Para quem escalona o que exceder a alçada do substituto. */
  escalonaParaId: string | null;
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

/**
 * Regra que impede duas ausências incompatíveis na mesma janela.
 * `alvo` casa contra a área ou o nível hierárquico do cargo.
 */
export interface RegraBloqueio {
  id: string;
  descricao: string;
  /** Texto que precisa aparecer na área ou no cargo para a regra valer. */
  alvo: string;
  /** Quantas ausências simultâneas o alvo tolera. */
  maximoSimultaneo: number;
  ativa: boolean;
}

/** Conflito detectado entre duas programações de férias. */
export interface ConflitoFerias {
  regra: RegraBloqueio;
  feriasIds: string[];
  pessoas: string[];
  inicio: string;
  fim: string;
}

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

/** Dias entre ocorrências, por frequência. 0 = não recorre. */
export const DIAS_POR_FREQUENCIA: Record<Frequencia, number> = {
  "Diária": 1,
  "Semanal": 7,
  "Quinzenal": 14,
  "Mensal": 30,
  "Trimestral": 91,
  "Semestral": 182,
  "Anual": 365,
  "Sob demanda": 0,
};

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
  /** ISO date da próxima ocorrência — alimenta o calendário e o lembrete. */
  proximaExecucao: string | null;
  /** Hora da ocorrência, "HH:MM". Vazio = dia inteiro. */
  horario: string;
  /** Dias corridos entre a ocorrência e o prazo final de execução. */
  diasParaPrazo: number;
  /** Quantos dias antes o painel avisa. 0 = avisa no dia. */
  lembreteDiasAntes: number;
  /** Quem participa da reunião/execução — vira lista padrão da ata. */
  participantesIds: string[];
  /** Existe POP/documentação escrita? */
  documentado: boolean;
  /** Link para o documento, planilha ou pasta do processo. */
  link: string;
}

/** Ata de uma ocorrência do processo. Versionada no GitHub por processo. */
export interface Ata {
  id: string;
  processoId: string;
  /** ISO date da reunião/execução. */
  data: string;
  titulo: string;
  /** Ids das pessoas presentes. */
  participantesIds: string[];
  /** Participantes externos, texto livre separado por vírgula. */
  participantesExternos: string;
  pauta: string;
  /** O que ficou decidido. */
  decisoes: string;
  /** Encaminhamentos: "o quê — quem — quando", uma por linha. */
  encaminhamentos: string;
  observacoes: string;
  /** Caminho no repositório, quando já sincronizada. */
  caminhoGit: string | null;
  /** ISO datetime da última sincronização com o GitHub. */
  sincronizadaEm: string | null;
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

// -------------------------------------------------------------- Agenda

export type TipoEvento =
  | "Viagem"
  | "Reunião"
  | "Evento de mercado"
  | "Feriado"
  | "Fechamento de ciclo"
  | "Outro";

export const TIPOS_EVENTO: TipoEvento[] = [
  "Viagem", "Reunião", "Evento de mercado", "Feriado", "Fechamento de ciclo", "Outro",
];

/** Compromisso da agenda que não vem de processo, férias ou aprovação. */
export interface Evento {
  id: string;
  titulo: string;
  tipo: TipoEvento;
  /** ISO date. */
  inicio: string;
  /** ISO date; igual a `inicio` em evento de um dia. */
  fim: string;
  local: string;
  /** Quem está envolvido — vazio = você. */
  pessoasIds: string[];
  observacao: string;
}

/** Item já normalizado para o calendário, venha de onde vier. */
export interface ItemAgenda {
  id: string;
  origem: "processo" | "ferias" | "evento" | "aprovacao";
  titulo: string;
  detalhe: string;
  inicio: string;
  fim: string;
  /** Cor/semântica do item na grade. */
  tom: "processo" | "ferias" | "viagem" | "evento" | "prazo";
  /** Hora "HH:MM", quando houver. */
  horario: string;
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

// ------------------------------------------------------------------ KPIs

/** O ocupante controla a alavanca do indicador? */
export type Controlabilidade = "Sim" | "Parcial" | "Não";

/**
 * REGRA DE OURO: KPI cuja alavanca o ocupante não controla não pode ser
 * usado para cobrança nem como base de remuneração variável — apenas
 * acompanhamento. Cobrar margem de quem não decide preço produz
 * desengajamento, não performance.
 */
export type UsoKpi = "Cobrança + variável" | "Cobrança" | "Acompanhamento";

export const USOS_KPI: UsoKpi[] = ["Cobrança + variável", "Cobrança", "Acompanhamento"];

export interface Kpi {
  id: string;
  cargoId: string;
  nome: string;
  definicao: string;
  fonte: string;
  meta: string;
  periodicidade: Frequencia;
  controla: Controlabilidade;
  uso: UsoKpi;
  /** Peso na composição da avaliação/variável, em %. */
  peso: number;
  observacao: string;
}

/**
 * O uso declarado é compatível com a controlabilidade? Indicador fora do
 * controle do ocupante só pode ser acompanhamento.
 */
export function usoKpiValido(kpi: Kpi): boolean {
  if (kpi.controla === "Sim") return true;
  if (kpi.controla === "Parcial") return kpi.uso !== "Cobrança + variável";
  return kpi.uso === "Acompanhamento";
}

// ------------------------------------------------------------- Trilha

export interface DegrauTrilha {
  id: string;
  eixo: EixoTrilha;
  /** "T1", "G2". */
  nivel: string;
  cargoReferencia: string;
  /** O que a pessoa precisa demonstrar para estar neste degrau. */
  demonstrar: string;
  tempoMinimoMeses: number;
  criterioPromocao: string;
  proximoTecnico: string;
  proximoGestao: string;
}

// ------------------------------------------------------ Sincronização Git

/**
 * Configuração da sincronização com o GitHub. O token é um PAT de escopo
 * fino, restrito a este repositório, guardado apenas no navegador — nunca
 * exportado no backup JSON nem versionado.
 */
export interface ConfigGit {
  owner: string;
  repo: string;
  branch: string;
  /** Pasta onde o banco e as atas são gravados. */
  pasta: string;
  /** ISO datetime da última sincronização bem-sucedida. */
  ultimaSync: string | null;
  /**
   * Identificador da versão do banco que este aparelho baixou por último.
   * É a trava contra perda de dado: se o servidor tiver outro, alguém
   * gravou de outro lugar e o envio é bloqueado em vez de sobrescrever.
   */
  shaBanco: string | null;
  /** Sincroniza sozinho ao abrir e alguns segundos depois de cada edição. */
  autoSync: boolean;
  /** Visibilidade detectada no último teste de conexão. */
  repoPrivado: boolean | null;
}

export const CONFIG_GIT_PADRAO: ConfigGit = {
  owner: "",
  repo: "",
  branch: "main",
  pasta: "gestao",
  ultimaSync: null,
  shaBanco: null,
  autoSync: true,
  repoPrivado: null,
};

// ------------------------------------------------------------------ Banco

export interface Banco {
  versao: number;
  atualizadoEm: string;
  cargos: Cargo[];
  faixas: Faixa[];
  pessoas: Pessoa[];
  ferias: Ferias[];
  regrasBloqueio: RegraBloqueio[];
  processos: Processo[];
  atas: Ata[];
  aprovacoes: Aprovacao[];
  eventos: Evento[];
  avaliacoes: Avaliacao[];
  kpis: Kpi[];
  trilha: DegrauTrilha[];
  git: ConfigGit;
}

export const VERSAO_BANCO = 2;

export const BANCO_VAZIO: Banco = {
  versao: VERSAO_BANCO,
  atualizadoEm: new Date().toISOString(),
  cargos: [],
  faixas: [],
  pessoas: [],
  ferias: [],
  regrasBloqueio: [],
  processos: [],
  atas: [],
  aprovacoes: [],
  eventos: [],
  avaliacoes: [],
  kpis: [],
  trilha: [],
  git: { ...CONFIG_GIT_PADRAO },
};
