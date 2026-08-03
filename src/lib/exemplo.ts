/**
 * Carga inicial — Arquitetura de Cargos LR Nordeste.
 *
 * Reproduz a estrutura da Diretoria Comercial & Desenvolvimento de
 * Negócios: catálogo de cargos, quadro de pessoal, KPIs por cargo,
 * trilha de dois eixos e regras de bloqueio de férias.
 *
 * Salários e faixas ficam em branco de propósito — dependem de benchmark
 * e de decisão do gestor. Supply Chain, Faturamento e Jurídico aparecem
 * apenas como interface funcional: não são subordinação desta diretoria e
 * por isso não recebem cargo, atribuição nem KPI aqui.
 */

import type {
  Ata,
  Banco,
  Cargo,
  DegrauTrilha,
  Kpi,
  Pessoa,
  Processo,
  RegraBloqueio,
} from "../types";
import { BANCO_VAZIO, VERSAO_BANCO } from "../types";
import { hojeISO, somarDias } from "./datas";

// ---------------------------------------------------------------- Cargos

const CARGOS: Cargo[] = [
  {
    id: "c_head",
    nome: "Head Comercial & Desenv. de Negócios",
    nivel: "Único",
    area: "Diretoria Comercial",
    nivelHierarquico: "1 - Diretoria",
    proposito:
      "Responder pelo resultado comercial consolidado e pela agenda de desenvolvimento de negócios da companhia.",
    atribuicoes: [
      "Direção das regionais",
      "Governança de preço e margem",
      "Desenvolvimento de portfólio e canais",
      "Relacionamento com contas estratégicas",
    ],
    entregaveis: ["Orçamento comercial", "Plano de crescimento por canal", "Ciclo de metas"],
    reportaAId: null,
    interfaces: ["Supply Chain", "Financeiro", "Jurídico", "Marketing"],
    alcada:
      "Política comercial; exceções de preço acima da alçada de RGM; abertura e encerramento de canal.",
    requisitos:
      "Superior completo; experiência em gestão comercial multirregional em HPPC/CPG.",
    vinculo: "CLT",
  },
  {
    id: "c_gr_sr",
    nome: "Gerente Regional de Vendas",
    nivel: "Sênior",
    area: "Comercial - Regional",
    nivelHierarquico: "2 - Gerência",
    proposito:
      "Entregar o resultado de venda, mix e margem da regional dentro da política comercial vigente.",
    atribuicoes: [
      "Gestão da carteira e dos RCAs",
      "Execução do ciclo de metas",
      "Negociação com contas regionais",
      "Disciplina de preço em campo",
    ],
    entregaveis: ["Plano de crescimento por cliente", "Forecast mensal", "Relatório de visita"],
    reportaAId: "c_head",
    interfaces: ["RGM", "ADM de Vendas", "Supply Chain"],
    alcada:
      "Desconto até o limite da tabela vigente; mix e prazo dentro da política; acima disso escala para RGM.",
    requisitos: "Superior completo; 5+ anos em gestão de equipe comercial.",
    vinculo: "CLT",
  },
  {
    id: "c_gr_pl",
    nome: "Gerente Regional de Vendas",
    nivel: "Pleno",
    area: "Comercial - Regional",
    nivelHierarquico: "2 - Gerência",
    proposito:
      "Entregar o resultado de venda, mix e margem da regional dentro da política comercial vigente.",
    atribuicoes: [
      "Gestão da carteira e dos RCAs",
      "Execução do ciclo de metas",
      "Negociação com contas regionais",
    ],
    entregaveis: ["Plano de crescimento por cliente", "Forecast mensal"],
    reportaAId: "c_head",
    interfaces: ["RGM", "ADM de Vendas", "Supply Chain"],
    alcada: "Desconto até o limite da tabela vigente; acima disso escala para RGM.",
    requisitos: "Superior completo; 3+ anos em gestão comercial.",
    vinculo: "CLT",
  },
  {
    id: "c_rgm",
    nome: "Coordenador de RGM",
    nivel: "Único",
    area: "RGM / Pricing",
    nivelHierarquico: "3 - Coordenação",
    proposito:
      "Sustentar a governança de preço e o equilíbrio entre receita e margem por SKU, cliente e UF.",
    atribuicoes: [
      "Estrutura de tabelas e política de desconto",
      "Aprovação de plano de crescimento por cliente",
      "Análise de elasticidade e mix",
    ],
    entregaveis: ["Tabela de preço por UF", "Parecer de aprovação de plano", "Painel de margem"],
    reportaAId: "c_head",
    interfaces: ["Regionais", "Financeiro", "Trade Marketing"],
    alcada:
      "Aprova ou recusa exceção de preço dentro do limite delegado; define piso por UF.",
    requisitos: "Superior completo; domínio de pricing e análise quantitativa.",
    vinculo: "CLT",
  },
  {
    id: "c_bi",
    nome: "Analista de RGM / BI",
    nivel: "Pleno",
    area: "RGM / Pricing",
    nivelHierarquico: "4 - Analista",
    proposito: "Produzir a base analítica que sustenta as decisões de preço e margem.",
    atribuicoes: [
      "Extração e tratamento da base comercial",
      "Construção de painéis",
      "Simulação de cenário de preço",
    ],
    entregaveis: ["Painel de preço e margem", "Simulações", "Base tratada"],
    reportaAId: "c_rgm",
    interfaces: ["ADM de Vendas", "TI"],
    alcada: "Sem alçada decisória — produz análise e recomendação.",
    requisitos: "Superior em área quantitativa; SQL/Excel avançado.",
    vinculo: "CLT",
  },
  {
    id: "c_adm",
    nome: "Coordenador de ADM de Vendas",
    nivel: "Único",
    area: "ADM de Vendas",
    nivelHierarquico: "3 - Coordenação",
    proposito:
      "Garantir que o pedido percorra o ciclo crédito-faturamento sem ruptura de processo.",
    atribuicoes: [
      "Análise e liberação de crédito",
      "Gestão de pedidos no ERP",
      "Apuração da remuneração variável",
      "Back-office comercial",
    ],
    entregaveis: ["Fila de pedidos", "Relatório de bloqueio", "Apuração de variável"],
    reportaAId: "c_head",
    interfaces: ["Financeiro", "Supply Chain", "Regionais"],
    alcada: "Libera pedido dentro do limite de crédito vigente; acima disso escala.",
    requisitos: "Superior completo; domínio de ERP e rotina de crédito.",
    vinculo: "CLT",
  },
  {
    id: "c_digital",
    nome: "Analista Comercial / Digital",
    nivel: "Pleno",
    area: "Digital Commerce",
    nivelHierarquico: "4 - Analista",
    proposito: "Sustentar a operação digital e a inteligência analítica do comercial.",
    atribuicoes: [
      "Gestão de marketplaces",
      "Desenvolvimento de BI comercial",
      "Acompanhamento de sellout",
    ],
    entregaveis: ["Painel comercial", "Relatório de performance digital"],
    reportaAId: "c_head",
    interfaces: ["RGM", "Trade Marketing", "Supply Chain"],
    alcada: "Ajuste operacional em marketplace dentro da política de preço vigente.",
    requisitos: "Superior completo; BI e plataformas de e-commerce.",
    vinculo: "CLT",
  },
  {
    id: "c_intel",
    nome: "Analista de Inteligência de Mercado",
    nivel: "Pleno",
    area: "Trade Marketing",
    nivelHierarquico: "4 - Analista",
    proposito: "Traduzir dado de mercado e sellout em leitura acionável para o comercial.",
    atribuicoes: [
      "Monitoramento de sellout e preço de mercado",
      "Análise de share",
      "Suporte a plano de canal",
    ],
    entregaveis: ["Relatório de sellout", "Monitor de preço"],
    reportaAId: "c_head",
    interfaces: ["RGM", "Regionais"],
    alcada: "Sem alçada decisória — produz análise e recomendação.",
    requisitos: "Superior completo; análise de dados de mercado.",
    vinculo: "CLT",
  },
  {
    id: "c_sac",
    nome: "Coordenador de SAC",
    nivel: "Único",
    area: "SAC / Canal Farma",
    nivelHierarquico: "3 - Coordenação",
    proposito:
      "Responder pelo atendimento ao consumidor e pela classificação correta das ocorrências.",
    atribuicoes: [
      "Gestão do fluxo de SAC",
      "Classificação de reclamação, dúvida e sugestão",
      "Acionamento de qualidade e jurídico",
    ],
    entregaveis: ["Relatório mensal de ocorrências", "Índice de resolução"],
    reportaAId: "c_head",
    interfaces: ["Qualidade", "Jurídico", "Marketing"],
    alcada:
      "Decide tratativa comercial ao consumidor dentro do limite de ressarcimento vigente.",
    requisitos: "Superior completo; experiência em atendimento e canal farma.",
    vinculo: "CLT",
  },
  {
    id: "c_produto",
    nome: "Analista de Desenv. de Produto",
    nivel: "Pleno",
    area: "Desenvolvimento de Produto / P&D",
    nivelHierarquico: "4 - Analista",
    proposito: "Conduzir o desenvolvimento e a conformidade regulatória do portfólio.",
    atribuicoes: [
      "Briefing e desenvolvimento de SKU",
      "Dossiê regulatório",
      "Interface com fornecedores de fragrância e embalagem",
    ],
    entregaveis: ["Cronograma de lançamento", "Dossiê ANVISA"],
    reportaAId: "c_head",
    interfaces: ["P&D", "Supply Chain", "Marketing"],
    alcada: "Sem alçada decisória sobre lançamento — instrui e recomenda.",
    requisitos:
      "Superior em química, farmácia ou correlata; conhecimento regulatório HPPC.",
    vinculo: "CLT",
  },
  {
    id: "c_assist",
    nome: "Assistente Administrativo Comercial",
    nivel: "Pleno",
    area: "Diretoria Comercial",
    nivelHierarquico: "5 - Assistente",
    proposito: "Sustentar a rotina administrativa e documental da diretoria comercial.",
    atribuicoes: [
      "Suporte operacional à diretoria",
      "Organização documental",
      "Apoio a rotinas de ADM e RGM",
    ],
    entregaveis: ["Controles administrativos", "Agenda e documentação"],
    reportaAId: "c_head",
    interfaces: ["ADM de Vendas", "RGM"],
    alcada: "Sem alçada decisória.",
    requisitos: "Ensino superior em andamento; Excel intermediário.",
    vinculo: "CLT",
  },
  {
    id: "c_rca",
    nome: "Representante Comercial Autônomo",
    nivel: "Único",
    area: "Comercial - Regional",
    nivelHierarquico: "6 - Representação",
    proposito:
      "Executar a venda na praça sob a política comercial e a orientação do GR da regional.",
    atribuicoes: [
      "Visitação e positivação",
      "Colocação de pedido",
      "Execução de preço e mix conforme tabela",
    ],
    entregaveis: ["Pedido", "Relatório de visita", "Mapa de cobertura"],
    reportaAId: "c_gr_sr",
    interfaces: ["ADM de Vendas"],
    alcada: "Sem alçada de desconto — aplica tabela vigente.",
    requisitos: "Registro no CORE; carteira ativa na praça.",
    vinculo: "PJ / Representação",
  },
];

// -------------------------------------------------------- Quadro pessoal

/** Salário e admissão em branco: dependem de confirmação junto à folha. */
function pessoa(
  id: string,
  nome: string,
  cargoId: string,
  area: string,
  gestorId: string | null,
  eixo: Pessoa["trilhaEixo"],
  observacoes = "",
): Pessoa {
  return {
    id,
    nome,
    email: "",
    cargoId,
    area,
    regime: cargoId === "c_rca" ? "PJ / Representação" : "CLT",
    dataAdmissao: "",
    salario: 0,
    modeloVariavel: "",
    gestorId,
    substitutoId: null,
    trilhaEixo: eixo,
    status: "Ativo",
    atribuicoes: [],
    observacoes,
  };
}

const PESSOAS: Pessoa[] = [
  pessoa("p_rafael", "Rafael Rangel", "c_head", "Diretoria Comercial", null, "Gestão"),
  pessoa("p_almir", "Almir", "c_gr_sr", "Comercial - Regional NORDESTE", "p_rafael", "Gestão"),
  pessoa("p_carlos", "Carlos Mendes", "c_gr_pl", "Comercial - Regional NORTE", "p_rafael", "Gestão", "Conta Grupo Mateus"),
  pessoa("p_julio", "Julio Campos", "c_gr_pl", "Comercial - Regional CO+TO", "p_rafael", "Gestão"),
  pessoa("p_vinicius", "Vinicius", "c_gr_pl", "Comercial - Regional RJ+MG+ES", "p_rafael", "Gestão", "Confirmar sobrenome no cadastro"),
  pessoa("p_mariana", "Mariana", "c_rgm", "RGM / Pricing", "p_rafael", "Gestão"),
  pessoa("p_taina", "Tainá", "c_bi", "RGM / Pricing", "p_mariana", "Técnico"),
  pessoa("p_roberto", "Roberto", "c_adm", "ADM de Vendas", "p_rafael", "Gestão"),
  pessoa("p_andre", "André", "c_digital", "Digital Commerce", "p_rafael", "Técnico"),
  pessoa("p_natalia", "Natalia Santos", "c_intel", "Trade Marketing", "p_rafael", "Técnico"),
  pessoa("p_tatiana", "Tatiana", "c_sac", "SAC / Canal Farma", "p_rafael", "Gestão"),
  pessoa("p_rafaela", "Rafaela", "c_produto", "Desenvolvimento de Produto / P&D", "p_rafael", "Técnico"),
  pessoa("p_bianca", "Bianca Poncio", "c_assist", "Diretoria Comercial", "p_rafael", "Técnico"),
];

// ------------------------------------------------------------------ KPIs

function kpi(
  id: string,
  cargoId: string,
  nome: string,
  definicao: string,
  fonte: string,
  periodicidade: Kpi["periodicidade"],
  controla: Kpi["controla"],
  uso: Kpi["uso"],
  observacao = "",
): Kpi {
  return {
    id, cargoId, nome, definicao, fonte, meta: "",
    periodicidade, controla, uso, peso: 0, observacao,
  };
}

const KPIS: Kpi[] = [
  kpi("k1", "c_gr_sr", "Faturamento líquido da regional", "Receita líquida realizada vs. meta do ciclo", "ERP / DWLR", "Mensal", "Sim", "Cobrança + variável"),
  kpi("k2", "c_gr_sr", "Positivação de clientes", "Clientes com pedido faturado / base ativa", "ERP / DWLR", "Mensal", "Sim", "Cobrança + variável"),
  kpi("k3", "c_gr_sr", "Mix de itens-foco", "Volume de itens-foco / volume total da regional", "ERP / DWLR", "Mensal", "Sim", "Cobrança + variável"),
  kpi("k4", "c_gr_sr", "Margem de contribuição da regional", "Margem sobre valor bruto", "ERP / DWLR", "Mensal", "Parcial", "Acompanhamento", "Preço é decisão de RGM — não usar como base de variável enquanto o GR não tiver alçada."),
  kpi("k5", "c_gr_sr", "Ruptura de entrega", "Pedidos não faturados por indisponibilidade", "ERP / Supply", "Mensal", "Não", "Acompanhamento", "Alavanca em Supply Chain — indicador de contexto, nunca de cobrança do GR."),
  kpi("k6", "c_gr_pl", "Faturamento líquido da regional", "Receita líquida realizada vs. meta do ciclo", "ERP / DWLR", "Mensal", "Sim", "Cobrança + variável"),
  kpi("k7", "c_gr_pl", "Positivação de clientes", "Clientes com pedido faturado / base ativa", "ERP / DWLR", "Mensal", "Sim", "Cobrança + variável"),
  kpi("k8", "c_gr_pl", "Mix de itens-foco", "Volume de itens-foco / volume total da regional", "ERP / DWLR", "Mensal", "Sim", "Cobrança + variável"),
  kpi("k9", "c_rgm", "Aderência à tabela de preço", "Notas dentro da tabela / total de notas", "DWLR", "Mensal", "Sim", "Cobrança"),
  kpi("k10", "c_rgm", "Margem média consolidada", "Margem sobre valor bruto — consolidado", "DWLR", "Mensal", "Sim", "Cobrança + variável"),
  kpi("k11", "c_rgm", "Prazo de resposta a plano de crescimento", "Dias úteis entre submissão e parecer", "Controle interno", "Mensal", "Sim", "Cobrança"),
  kpi("k12", "c_adm", "Tempo médio de liberação de pedido", "Horas entre entrada e liberação", "ERP", "Mensal", "Sim", "Cobrança"),
  kpi("k13", "c_adm", "Pedidos bloqueados por crédito", "% sobre pedidos entrados", "ERP", "Mensal", "Parcial", "Acompanhamento", "Depende da política de crédito do Financeiro."),
  kpi("k14", "c_digital", "Faturamento dos canais digitais", "Receita líquida de marketplaces e e-commerce", "Plataformas", "Mensal", "Parcial", "Cobrança"),
  kpi("k15", "c_digital", "Disponibilidade de anúncio", "Anúncios ativos / catálogo publicado", "Plataformas", "Semanal", "Sim", "Cobrança"),
  kpi("k16", "c_sac", "Índice de resolução no primeiro contato", "Ocorrências resolvidas em 1 contato / total", "Sistema de SAC", "Mensal", "Sim", "Cobrança"),
  kpi("k17", "c_sac", "Tempo médio de resposta", "Horas até primeira resposta", "Sistema de SAC", "Mensal", "Sim", "Cobrança"),
  kpi("k18", "c_produto", "Aderência ao cronograma de lançamento", "Marcos entregues no prazo / marcos previstos", "Controle de projeto", "Mensal", "Parcial", "Cobrança"),
  kpi("k19", "c_intel", "Pontualidade do relatório de sellout", "Entregas no prazo / entregas previstas", "Controle interno", "Mensal", "Sim", "Cobrança"),
  kpi("k20", "c_bi", "Pontualidade e acurácia do painel", "Entregas no prazo sem retrabalho / total", "Controle interno", "Mensal", "Sim", "Cobrança"),
  kpi("k21", "c_rca", "Positivação da carteira", "Clientes positivados / carteira ativa", "ERP / DWLR", "Mensal", "Sim", "Cobrança + variável"),
  kpi("k22", "c_rca", "Cobertura de visita", "Visitas realizadas / roteiro previsto", "App de campo", "Semanal", "Sim", "Cobrança"),
];

// ---------------------------------------------------------------- Trilha

const TRILHA: DegrauTrilha[] = [
  {
    id: "t1", eixo: "Técnico", nivel: "T1", cargoReferencia: "Assistente Administrativo Comercial",
    demonstrar: "Executa rotina definida com supervisão; confiabilidade e prazo.",
    tempoMinimoMeses: 12,
    criterioPromocao: "Entrega estável por 2 ciclos consecutivos; domínio das ferramentas da área.",
    proximoTecnico: "Analista Júnior", proximoGestao: "—",
  },
  {
    id: "t2", eixo: "Técnico", nivel: "T2", cargoReferencia: "Analista Júnior",
    demonstrar: "Executa análise estruturada com autonomia parcial; identifica inconsistência no próprio trabalho.",
    tempoMinimoMeses: 18,
    criterioPromocao: "Autonomia em rotina completa; zero retrabalho crítico em 2 ciclos.",
    proximoTecnico: "Analista Pleno", proximoGestao: "—",
  },
  {
    id: "t3", eixo: "Técnico", nivel: "T3", cargoReferencia: "Analista Pleno",
    demonstrar: "Conduz análise de ponta a ponta; propõe recomendação com racional próprio.",
    tempoMinimoMeses: 24,
    criterioPromocao: "Recomendação adotada com resultado mensurável; forma sucessor na rotina.",
    proximoTecnico: "Analista Sênior", proximoGestao: "Coordenador",
  },
  {
    id: "t4", eixo: "Técnico", nivel: "T4", cargoReferencia: "Analista Sênior / Especialista",
    demonstrar: "Referência técnica da área; define método e padrão para os demais.",
    tempoMinimoMeses: 0,
    criterioPromocao: "Teto do eixo técnico — progressão por faixa salarial e escopo, não por cargo.",
    proximoTecnico: "Especialista", proximoGestao: "Coordenador / Gerente",
  },
  {
    id: "g1", eixo: "Gestão", nivel: "G1", cargoReferencia: "Coordenador",
    demonstrar: "Responde por resultado de área e por pessoas; sustenta processo e prazo.",
    tempoMinimoMeses: 24,
    criterioPromocao: "Área entrega o ciclo com equipe estável; conduz avaliação dos liderados.",
    proximoTecnico: "—", proximoGestao: "Gerente",
  },
  {
    id: "g2", eixo: "Gestão", nivel: "G2", cargoReferencia: "Gerente Regional / Gerente de Área",
    demonstrar: "Responde por P&L ou resultado regional; negocia e sustenta política em campo.",
    tempoMinimoMeses: 36,
    criterioPromocao: "Regional entrega meta por 3 ciclos; forma ao menos um sucessor.",
    proximoTecnico: "—", proximoGestao: "Head / Diretoria",
  },
  {
    id: "g3", eixo: "Gestão", nivel: "G3", cargoReferencia: "Head / Diretoria",
    demonstrar: "Responde por resultado consolidado e por definição de política.",
    tempoMinimoMeses: 0,
    criterioPromocao: "Teto da estrutura atual.",
    proximoTecnico: "—", proximoGestao: "—",
  },
];

// ------------------------------------------------------- Regras de férias

const REGRAS: RegraBloqueio[] = [
  {
    id: "rb1",
    descricao: "Não mais de um Gerente Regional ausente na mesma janela.",
    alvo: "Gerente Regional",
    maximoSimultaneo: 1,
    ativa: true,
  },
  {
    id: "rb2",
    descricao: "RGM e ADM de Vendas não podem estar ausentes simultaneamente.",
    alvo: "Coordenador",
    maximoSimultaneo: 1,
    ativa: true,
  },
  {
    id: "rb3",
    descricao:
      "Nenhuma ausência de GR na semana de fechamento do ciclo de metas — verificar contra o calendário.",
    alvo: "Gerente Regional",
    maximoSimultaneo: 1,
    ativa: false,
  },
];

// ------------------------------------------------------------- Processos

function processo(
  id: string,
  nome: string,
  area: string,
  donoId: string | null,
  backupId: string | null,
  frequencia: Processo["frequencia"],
  criticidade: Processo["criticidade"],
  entregavel: string,
  prazo: string,
  indicador: string,
  proximaEmDias: number,
  horario: string,
  diasParaPrazo: number,
  participantesIds: string[] = [],
): Processo {
  const hoje = hojeISO();
  return {
    id, nome, area, descricao: "", donoId, backupId, frequencia, criticidade,
    entregavel, prazo, indicador, meta: "", status: "Em dia",
    ultimaExecucao: null,
    proximaExecucao: somarDias(hoje, proximaEmDias),
    horario, diasParaPrazo, lembreteDiasAntes: 1,
    participantesIds, documentado: false, link: "",
  };
}

const PROCESSOS: Processo[] = [
  processo(
    "pr1", "Reunião semanal de resultado — regionais", "Comercial - Regional",
    "p_rafael", "p_mariana", "Semanal", "Alta",
    "Ata com decisões e encaminhamentos por regional", "Toda segunda, 9h",
    "Aderência da agenda e encaminhamentos fechados no prazo",
    1, "09:00", 0,
    ["p_almir", "p_carlos", "p_julio", "p_vinicius", "p_mariana"],
  ),
  processo(
    "pr2", "Comitê de preço e margem", "RGM / Pricing",
    "p_mariana", "p_taina", "Quinzenal", "Crítica",
    "Tabela vigente e parecer sobre exceções", "Quinzenal, quarta",
    "Aderência à tabela de preço",
    3, "14:00", 2,
    ["p_rafael", "p_mariana", "p_taina"],
  ),
  processo(
    "pr3", "Fechamento do ciclo de metas", "Diretoria Comercial",
    "p_roberto", "p_mariana", "Mensal", "Crítica",
    "Apuração de metas e remuneração variável", "Até o 5º dia útil",
    "Fechamento concluído no prazo",
    12, "", 5,
    ["p_rafael", "p_roberto", "p_mariana"],
  ),
  processo(
    "pr4", "Relatório de sellout e monitor de preço", "Trade Marketing",
    "p_natalia", null, "Mensal", "Alta",
    "Relatório de sellout consolidado", "Até dia 10",
    "Pontualidade do relatório de sellout",
    8, "", 3,
  ),
  processo(
    "pr5", "Revisão de corridas Uber Business", "Diretoria Comercial",
    "p_rafael", "p_bianca", "Semanal", "Baixa",
    "Corridas da semana revisadas e aprovadas", "Toda sexta",
    "Revisão feita dentro da semana",
    4, "17:00", 0,
  ),
  processo(
    "pr6", "Forecast mensal por regional", "Comercial - Regional",
    "p_almir", "p_carlos", "Mensal", "Alta",
    "Forecast consolidado das regionais", "Até dia 20",
    "Acurácia do forecast vs. realizado",
    17, "", 2,
    ["p_almir", "p_carlos", "p_julio", "p_vinicius"],
  ),
];

const ATAS: Ata[] = [
  {
    id: "at1",
    processoId: "pr1",
    data: somarDias(hojeISO(), -6),
    titulo: "Reunião semanal de resultado — regionais",
    participantesIds: ["p_almir", "p_carlos", "p_julio", "p_vinicius", "p_mariana"],
    participantesExternos: "",
    pauta: "Fechamento da semana por regional; itens-foco; pendências de crédito.",
    decisoes:
      "Mantida a prioridade de itens-foco no Nordeste. Exceção de preço do Grupo Mateus segue para parecer do RGM.",
    encaminhamentos:
      "Enviar plano de crescimento do Grupo Mateus — Carlos — até sexta\nRevisar piso de preço PE/PB — Mariana — até quarta",
    observacoes: "",
    caminhoGit: null,
    sincronizadaEm: null,
  },
];

// ---------------------------------------------------------------- Montagem

/**
 * Banco com a arquitetura LR Nordeste carregada. Salários, faixas, datas
 * de admissão e metas ficam em branco para preenchimento.
 */
export function bancoExemplo(): Banco {
  return {
    ...structuredClone(BANCO_VAZIO),
    versao: VERSAO_BANCO,
    atualizadoEm: new Date().toISOString(),
    cargos: structuredClone(CARGOS),
    faixas: CARGOS.map((c, i) => ({
      id: `f${i}`,
      cargoId: c.id,
      minimo: 0,
      medio: 0,
      maximo: 0,
      referencia: "",
    })),
    pessoas: structuredClone(PESSOAS),
    kpis: structuredClone(KPIS),
    trilha: structuredClone(TRILHA),
    regrasBloqueio: structuredClone(REGRAS),
    processos: structuredClone(PROCESSOS),
    atas: structuredClone(ATAS),
    ferias: [],
    aprovacoes: [],
    eventos: [
      {
        id: "e1",
        titulo: "Feira/convenção de canal — reservar agenda",
        tipo: "Evento de mercado",
        inicio: somarDias(hojeISO(), 45),
        fim: somarDias(hojeISO(), 47),
        local: "",
        pessoasIds: [],
        observacao: "Confirmar datas oficiais.",
      },
    ],
    avaliacoes: [],
  };
}
