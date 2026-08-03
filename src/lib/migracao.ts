/**
 * Migração de bancos salvos em versões anteriores.
 *
 * A v1 guardava cargo e nível como texto dentro da própria Pessoa. A v2
 * separa CARGOS (tabela-mãe) de QUADRO DE PESSOAL: a pessoa passa a
 * apontar para um cargo. Para não perder o que já foi digitado, cada par
 * (cargo, nível) encontrado vira um Cargo novo, com os campos normativos
 * em branco para o gestor preencher.
 */

import {
  BANCO_VAZIO,
  VERSAO_BANCO,
  type Banco,
  type Cargo,
  type NivelCargo,
  type NivelHierarquico,
  type Regime,
} from "../types";

/** Formato da Pessoa na v1, para leitura do que estiver salvo. */
interface PessoaV1 {
  id: string;
  nome?: string;
  email?: string;
  cargo?: string;
  area?: string;
  nivel?: string;
  regime?: string;
  dataAdmissao?: string;
  salario?: number;
  gestorId?: string | null;
  status?: string;
  atribuicoes?: string[];
  observacoes?: string;
}

/** Níveis da v1 que viram nível de cargo na v2. */
const NIVEL_V1: Record<string, NivelCargo> = {
  "Estagiário": "Júnior",
  "Assistente": "Único",
  "Analista Júnior": "Júnior",
  "Analista Pleno": "Pleno",
  "Analista Sênior": "Sênior",
  "Especialista": "Especialista",
  "Coordenador": "Único",
  "Gerente": "Único",
};

/** Camada hierárquica inferida do texto do cargo/nível da v1. */
function hierarquiaDe(cargo: string, nivel: string): NivelHierarquico {
  const t = `${cargo} ${nivel}`.toLowerCase();
  if (/diretor|head|presid/.test(t)) return "1 - Diretoria";
  if (/gerente/.test(t)) return "2 - Gerência";
  if (/coorden|superv/.test(t)) return "3 - Coordenação";
  if (/assistente|auxiliar|estag/.test(t)) return "5 - Assistente";
  if (/represent/.test(t)) return "6 - Representação";
  return "4 - Analista";
}

function migrarV1(bruto: Record<string, unknown>): Banco {
  const base = structuredClone(BANCO_VAZIO);
  const pessoasV1 = (bruto.pessoas as PessoaV1[] | undefined) ?? [];

  const cargos: Cargo[] = [];
  const idPorChave = new Map<string, string>();

  pessoasV1.forEach((p, i) => {
    const nomeCargo = (p.cargo ?? "").trim() || "Cargo a definir";
    const nivel = NIVEL_V1[p.nivel ?? ""] ?? "Único";
    const chave = `${nomeCargo}|${nivel}`;
    if (idPorChave.has(chave)) return;
    const id = `c_mig_${i}`;
    idPorChave.set(chave, id);
    cargos.push({
      id,
      nome: nomeCargo,
      nivel,
      area: (p.area ?? "").trim(),
      nivelHierarquico: hierarquiaDe(nomeCargo, p.nivel ?? ""),
      proposito: "",
      atribuicoes: [],
      entregaveis: [],
      reportaAId: null,
      interfaces: [],
      alcada: "",
      requisitos: "",
      vinculo: (p.regime as Regime) ?? "CLT",
    });
  });

  return {
    ...base,
    ...(bruto as Partial<Banco>),
    versao: VERSAO_BANCO,
    cargos,
    pessoas: pessoasV1.map((p) => {
      const nomeCargo = (p.cargo ?? "").trim() || "Cargo a definir";
      const nivel = NIVEL_V1[p.nivel ?? ""] ?? "Único";
      return {
        id: p.id,
        nome: p.nome ?? "",
        email: p.email ?? "",
        cargoId: idPorChave.get(`${nomeCargo}|${nivel}`) ?? null,
        area: p.area ?? "",
        regime: (p.regime as Regime) ?? "CLT",
        dataAdmissao: p.dataAdmissao ?? "",
        salario: p.salario ?? 0,
        modeloVariavel: "",
        gestorId: p.gestorId ?? null,
        substitutoId: null,
        trilhaEixo: null,
        status: (p.status as Banco["pessoas"][number]["status"]) ?? "Ativo",
        atribuicoes: p.atribuicoes ?? [],
        observacoes: p.observacoes ?? "",
      };
    }),
    // Coleções novas na v2 começam vazias; férias ganham os campos de
    // substituto sem perder a programação já feita.
    ferias: ((bruto.ferias as Banco["ferias"] | undefined) ?? []).map((f) => ({
      ...f,
      substitutoId: f.substitutoId ?? null,
      alcadaSubstituto: f.alcadaSubstituto ?? "",
      escalonaParaId: f.escalonaParaId ?? null,
    })),
    processos: ((bruto.processos as Banco["processos"] | undefined) ?? []).map((p) => ({
      ...p,
      proximaExecucao: p.proximaExecucao ?? null,
      horario: p.horario ?? "",
      diasParaPrazo: p.diasParaPrazo ?? 0,
      lembreteDiasAntes: p.lembreteDiasAntes ?? 1,
      participantesIds: p.participantesIds ?? [],
    })),
    faixas: [],
    regrasBloqueio: [],
    atas: [],
    eventos: [],
    kpis: [],
    trilha: [],
    git: { ...base.git },
  };
}

/**
 * Normaliza qualquer banco lido do disco para a versão corrente,
 * preenchendo coleções e campos que não existiam antes.
 */
export function migrar(bruto: unknown): Banco {
  if (typeof bruto !== "object" || bruto === null) {
    return structuredClone(BANCO_VAZIO);
  }
  const dados = bruto as Record<string, unknown>;
  const versao = typeof dados.versao === "number" ? dados.versao : 1;

  const migrado = versao < 2 ? migrarV1(dados) : { ...structuredClone(BANCO_VAZIO), ...(dados as Partial<Banco>) };

  // Garante que toda coleção exista mesmo em backups truncados.
  return {
    ...structuredClone(BANCO_VAZIO),
    ...migrado,
    versao: VERSAO_BANCO,
    git: { ...BANCO_VAZIO.git, ...(migrado.git ?? {}) },
  };
}
