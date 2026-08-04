/**
 * Arquitetura de cargos — a tabela-mãe do sistema.
 *
 * Quatro visões da mesma estrutura: o catálogo de cargos, as faixas
 * salariais (acesso restrito), os KPIs por cargo e a trilha de carreira.
 */

import { useMemo, useState } from "react";
import type { Dados } from "../App";
import type {
  Cargo,
  DegrauTrilha,
  EixoTrilha,
  Faixa,
  Kpi,
  NivelCargo,
  NivelHierarquico,
  Regime,
} from "../types";
import {
  amplitudeFaixa,
  chaveCargo,
  NIVEIS_CARGO,
  NIVEIS_HIERARQUICOS,
  usoKpiValido,
  USOS_KPI,
} from "../types";
import { Abas, Badge, Campo, ListaTexto, Modal, Vazio, type TomBadge } from "../components/ui";
import { fmtBRL, fmtNum, novoId } from "../lib/formato";

type AbaCargos = "catalogo" | "faixas" | "kpis" | "trilha";

const REGIMES: Regime[] = ["CLT", "PJ", "PJ / Representação", "Estágio", "Aprendiz", "Terceiro"];

const FREQUENCIAS = [
  "Diária", "Semanal", "Quinzenal", "Mensal", "Trimestral", "Semestral", "Anual", "Sob demanda",
] as const;

/** Amplitude saudável de faixa: entre 30% e 50%. */
const AMPLITUDE_MIN = 30;
const AMPLITUDE_MAX = 50;

export function Cargos({ dados }: { dados: Dados }) {
  const [aba, setAba] = useState<AbaCargos>("catalogo");
  const [faixasVisiveis, setFaixasVisiveis] = useState(false);

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Arquitetura de cargos</h1>
        <div className="sub">
          Cargo e pessoa são entidades separadas: o cargo existe independente de
          quem o ocupa. É esta tabela que sustenta faixa salarial, promoção sem
          troca de cargo e comparação de equidade interna.
        </div>
      </div>

      <Abas
        abas={[
          { id: "catalogo", rotulo: "Catálogo", contador: dados.banco.cargos.length },
          { id: "faixas", rotulo: "Faixas salariais" },
          { id: "kpis", rotulo: "KPIs", contador: dados.banco.kpis.length },
          { id: "trilha", rotulo: "Trilha de carreira" },
        ]}
        ativa={aba}
        aoTrocar={setAba}
      />

      {aba === "catalogo" && <Catalogo dados={dados} />}
      {aba === "faixas" && (
        <Faixas
          dados={dados}
          visivel={faixasVisiveis}
          revelar={() => setFaixasVisiveis(true)}
          ocultar={() => setFaixasVisiveis(false)}
        />
      )}
      {aba === "kpis" && <Kpis dados={dados} />}
      {aba === "trilha" && <Trilha dados={dados} />}
    </>
  );
}

// -------------------------------------------------------------- Catálogo

function cargoVazio(): Cargo {
  return {
    id: novoId("c"),
    nome: "",
    nivel: "Único",
    area: "",
    nivelHierarquico: "4 - Analista",
    proposito: "",
    atribuicoes: [],
    entregaveis: [],
    reportaAId: null,
    interfaces: [],
    alcada: "",
    requisitos: "",
    vinculo: "CLT",
  };
}

function Catalogo({ dados }: { dados: Dados }) {
  const { banco, atualizar } = dados;
  const [editando, setEditando] = useState<Cargo | null>(null);
  const [ehNovo, setEhNovo] = useState(false);

  const ordenados = useMemo(
    () =>
      [...banco.cargos].sort(
        (a, b) =>
          a.nivelHierarquico.localeCompare(b.nivelHierarquico) ||
          a.nome.localeCompare(b.nome) ||
          a.nivel.localeCompare(b.nivel),
      ),
    [banco.cargos],
  );

  const ocupantesDe = (cargoId: string) =>
    banco.pessoas.filter((p) => p.cargoId === cargoId && p.status !== "Desligado").length;

  const salvar = () => {
    if (!editando || !editando.nome.trim()) return;
    atualizar((b) => ({
      ...b,
      cargos: ehNovo
        ? [...b.cargos, editando]
        : b.cargos.map((c) => (c.id === editando.id ? editando : c)),
      // Todo cargo novo nasce com uma faixa em branco pronta para preencher.
      faixas:
        ehNovo && !b.faixas.some((f) => f.cargoId === editando.id)
          ? [...b.faixas, { id: novoId("f"), cargoId: editando.id, minimo: 0, medio: 0, maximo: 0, referencia: "" }]
          : b.faixas,
    }));
    setEditando(null);
  };

  const excluir = () => {
    if (!editando) return;
    const ocupantes = ocupantesDe(editando.id);
    const aviso = ocupantes
      ? `${ocupantes} pessoa(s) ocupam este cargo e ficarão sem classificação. Excluir mesmo assim?`
      : "Excluir este cargo?";
    if (!window.confirm(aviso)) return;
    atualizar((b) => ({
      ...b,
      cargos: b.cargos.filter((c) => c.id !== editando.id),
      faixas: b.faixas.filter((f) => f.cargoId !== editando.id),
      kpis: b.kpis.filter((k) => k.cargoId !== editando.id),
      pessoas: b.pessoas.map((p) =>
        p.cargoId === editando.id ? { ...p, cargoId: null } : p,
      ),
    }));
    setEditando(null);
  };

  const editar = (campo: keyof Cargo, valor: unknown) =>
    setEditando((c) => (c ? { ...c, [campo]: valor } : c));

  const nomeCargo = (id: string | null) => {
    const c = banco.cargos.find((x) => x.id === id);
    return c ? chaveCargo(c) : "—";
  };

  return (
    <>
      <div className="filtros">
        <button
          className="botao primario"
          onClick={() => {
            setEhNovo(true);
            setEditando(cargoVazio());
          }}
        >
          + Novo cargo
        </button>
      </div>

      <div className="cartao rolagem-x">
        {ordenados.length === 0 ? (
          <Vazio>
            Nenhum cargo cadastrado. Comece por aqui — as demais telas dependem
            desta tabela.
          </Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Cargo</th>
                <th>Área</th>
                <th>Camada</th>
                <th>Reporta a</th>
                <th className="num">Ocupantes</th>
                <th>Alçada</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((c) => (
                <tr
                  key={c.id}
                  className="clicavel"
                  onClick={() => {
                    setEhNovo(false);
                    setEditando({ ...c });
                  }}
                >
                  <td>
                    <div className="principal">{c.nome}</div>
                    <div className="secundario">{c.nivel}</div>
                  </td>
                  <td>{c.area}</td>
                  <td>{c.nivelHierarquico}</td>
                  <td>{nomeCargo(c.reportaAId)}</td>
                  <td className="num">{ocupantesDe(c.id)}</td>
                  <td style={{ maxWidth: 280 }}>
                    <div className="secundario">{c.alcada || "—"}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        titulo={ehNovo ? "Novo cargo" : "Editar cargo"}
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
      >
        {editando && (
          <>
            <div className="form-grade">
              <Campo label="Cargo" largo>
                <input
                  value={editando.nome}
                  onChange={(e) => editar("nome", e.target.value)}
                  autoFocus={ehNovo}
                  placeholder="Ex.: Gerente Regional de Vendas"
                />
              </Campo>
              <Campo label="Nível">
                <select
                  value={editando.nivel}
                  onChange={(e) => editar("nivel", e.target.value as NivelCargo)}
                >
                  {NIVEIS_CARGO.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Área">
                <input
                  value={editando.area}
                  onChange={(e) => editar("area", e.target.value)}
                />
              </Campo>
              <Campo label="Camada hierárquica">
                <select
                  value={editando.nivelHierarquico}
                  onChange={(e) =>
                    editar("nivelHierarquico", e.target.value as NivelHierarquico)
                  }
                >
                  {NIVEIS_HIERARQUICOS.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Reporta a (cargo)">
                <select
                  value={editando.reportaAId ?? ""}
                  onChange={(e) => editar("reportaAId", e.target.value || null)}
                >
                  <option value="">— (topo da estrutura)</option>
                  {banco.cargos
                    .filter((c) => c.id !== editando.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {chaveCargo(c)}
                      </option>
                    ))}
                </select>
              </Campo>
              <Campo label="Vínculo">
                <select
                  value={editando.vinculo}
                  onChange={(e) => editar("vinculo", e.target.value as Regime)}
                >
                  {REGIMES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Propósito da posição — por que ela existe" largo>
                <textarea
                  rows={2}
                  value={editando.proposito}
                  onChange={(e) => editar("proposito", e.target.value)}
                />
              </Campo>
              <Campo label="Atribuições núcleo (uma por linha)" largo>
                <ListaTexto
                  valor={editando.atribuicoes}
                  aoMudar={(v) => editar("atribuicoes", v)}
                />
              </Campo>
              <Campo label="Entregáveis (um por linha)" largo>
                <ListaTexto
                  valor={editando.entregaveis}
                  aoMudar={(v) => editar("entregaveis", v)}
                />
              </Campo>
              <Campo label="Interfaces funcionais críticas (uma por linha)" largo>
                <ListaTexto
                  valor={editando.interfaces}
                  aoMudar={(v) => editar("interfaces", v)}
                  linhas={2}
                />
              </Campo>
              <Campo label="Alçada decisória — o que decide sozinho e a partir de onde escalona" largo>
                <textarea
                  rows={2}
                  value={editando.alcada}
                  onChange={(e) => editar("alcada", e.target.value)}
                />
              </Campo>
              <Campo label="Requisitos mínimos" largo>
                <input
                  value={editando.requisitos}
                  onChange={(e) => editar("requisitos", e.target.value)}
                />
              </Campo>
            </div>
            <div className="modal-acoes">
              {!ehNovo && (
                <button className="botao perigo" onClick={excluir}>
                  Excluir
                </button>
              )}
              <button className="botao" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button
                className="botao primario"
                onClick={salvar}
                disabled={!editando.nome.trim()}
              >
                Salvar
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------- Faixas

function Faixas({
  dados,
  visivel,
  revelar,
  ocultar,
}: {
  dados: Dados;
  visivel: boolean;
  revelar: () => void;
  ocultar: () => void;
}) {
  const { banco, atualizar } = dados;

  const linhas = useMemo(
    () =>
      banco.cargos.map((cargo) => {
        const faixa =
          banco.faixas.find((f) => f.cargoId === cargo.id) ??
          ({ id: `virtual_${cargo.id}`, cargoId: cargo.id, minimo: 0, medio: 0, maximo: 0, referencia: "" } as Faixa);
        const ocupantes = banco.pessoas.filter(
          (p) => p.cargoId === cargo.id && p.status !== "Desligado",
        );
        const comSalario = ocupantes.filter((p) => p.salario > 0);
        const media = comSalario.length
          ? comSalario.reduce((s, p) => s + p.salario, 0) / comSalario.length
          : null;
        return { cargo, faixa, ocupantes: ocupantes.length, media };
      }),
    [banco.cargos, banco.faixas, banco.pessoas],
  );

  const editarFaixa = (cargoId: string, campo: keyof Faixa, valor: string) => {
    const numerico = campo === "referencia" ? valor : Number(valor) || 0;
    atualizar((b) => {
      const existe = b.faixas.some((f) => f.cargoId === cargoId);
      return {
        ...b,
        faixas: existe
          ? b.faixas.map((f) => (f.cargoId === cargoId ? { ...f, [campo]: numerico } : f))
          : [
              ...b.faixas,
              {
                id: novoId("f"),
                cargoId,
                minimo: 0,
                medio: 0,
                maximo: 0,
                referencia: "",
                [campo]: numerico,
              } as Faixa,
            ],
      };
    });
  };

  if (!visivel) {
    return (
      <div className="cartao" style={{ textAlign: "center", padding: 32 }}>
        <h2 style={{ marginTop: 0 }}>Faixas salariais — acesso restrito</h2>
        <p style={{ color: "var(--ink-2)", maxWidth: 520, margin: "0 auto 16px" }}>
          Faixas podem ser publicadas ao time; salários individuais, não. Esta
          aba fica oculta por padrão para você poder abrir o painel na frente de
          outras pessoas sem expor remuneração.
        </p>
        <button className="botao primario" onClick={revelar}>
          Mostrar faixas
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="filtros">
        <button className="botao" onClick={ocultar}>
          Ocultar faixas
        </button>
        <span className="sub">
          Amplitude saudável fica entre {AMPLITUDE_MIN}% e {AMPLITUDE_MAX}%.
          Estreita demais impede progressão sem promoção; larga demais esvazia o
          significado do nível.
        </span>
      </div>

      <div className="cartao rolagem-x">
        {linhas.length === 0 ? (
          <Vazio>Cadastre cargos antes de definir faixas.</Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Cargo</th>
                <th className="num">Mínimo</th>
                <th className="num">Médio</th>
                <th className="num">Máximo</th>
                <th className="num">Amplitude</th>
                <th className="num">Ocupantes</th>
                <th className="num">Média praticada</th>
                <th>Referência de mercado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ cargo, faixa, ocupantes, media }) => {
                const amplitude = amplitudeFaixa(faixa);
                const foraDaFaixa =
                  amplitude !== null &&
                  (amplitude < AMPLITUDE_MIN || amplitude > AMPLITUDE_MAX);
                const mediaForaDaFaixa =
                  media !== null &&
                  faixa.maximo > 0 &&
                  (media < faixa.minimo || media > faixa.maximo);
                return (
                  <tr key={cargo.id}>
                    <td>
                      <div className="principal">{cargo.nome}</div>
                      <div className="secundario">{cargo.nivel}</div>
                    </td>
                    {(["minimo", "medio", "maximo"] as const).map((campo) => (
                      <td key={campo} className="num">
                        <input
                          type="number"
                          min={0}
                          step="100"
                          style={{ width: 110, textAlign: "right" }}
                          value={faixa[campo] || ""}
                          onChange={(e) => editarFaixa(cargo.id, campo, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="num">
                      {amplitude === null ? (
                        "—"
                      ) : (
                        <Badge tom={foraDaFaixa ? "atencao" : "bom"}>
                          {fmtNum(amplitude)}%
                        </Badge>
                      )}
                    </td>
                    <td className="num">{ocupantes}</td>
                    <td className="num">
                      {media === null ? (
                        "—"
                      ) : mediaForaDaFaixa ? (
                        <Badge tom="critico">{fmtBRL(media)}</Badge>
                      ) : (
                        fmtBRL(media)
                      )}
                    </td>
                    <td>
                      <input
                        value={faixa.referencia}
                        placeholder="Fonte do benchmark"
                        onChange={(e) => editarFaixa(cargo.id, "referencia", e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ------------------------------------------------------------------ KPIs

function kpiVazio(cargoId: string): Kpi {
  return {
    id: novoId("k"),
    cargoId,
    nome: "",
    definicao: "",
    fonte: "",
    meta: "",
    periodicidade: "Mensal",
    controla: "Sim",
    uso: "Cobrança",
    peso: 0,
    observacao: "",
  };
}

const TOM_CONTROLA: Record<Kpi["controla"], TomBadge> = {
  Sim: "bom",
  Parcial: "atencao",
  "Não": "critico",
};

function Kpis({ dados }: { dados: Dados }) {
  const { banco, atualizar } = dados;
  const [editando, setEditando] = useState<Kpi | null>(null);
  const [ehNovo, setEhNovo] = useState(false);
  const [filtroCargo, setFiltroCargo] = useState("");

  const nomeCargo = (id: string) => {
    const c = banco.cargos.find((x) => x.id === id);
    return c ? chaveCargo(c) : "— cargo removido";
  };

  const lista = useMemo(
    () =>
      banco.kpis
        .filter((k) => (filtroCargo ? k.cargoId === filtroCargo : true))
        .sort((a, b) => nomeCargo(a.cargoId).localeCompare(nomeCargo(b.cargoId))),
    // nomeCargo depende de banco.cargos, já incluído nas dependências.
    [banco.kpis, banco.cargos, filtroCargo],
  );

  const invalidos = banco.kpis.filter((k) => !usoKpiValido(k));

  const salvar = () => {
    if (!editando || !editando.nome.trim()) return;
    atualizar((b) => ({
      ...b,
      kpis: ehNovo
        ? [...b.kpis, editando]
        : b.kpis.map((k) => (k.id === editando.id ? editando : k)),
    }));
    setEditando(null);
  };

  const excluir = () => {
    if (!editando || !window.confirm("Excluir este KPI?")) return;
    atualizar((b) => ({ ...b, kpis: b.kpis.filter((k) => k.id !== editando.id) }));
    setEditando(null);
  };

  const editar = (campo: keyof Kpi, valor: unknown) =>
    setEditando((k) => (k ? { ...k, [campo]: valor } : k));

  return (
    <>
      <div className="filtros">
        <button
          className="botao primario"
          disabled={banco.cargos.length === 0}
          onClick={() => {
            setEhNovo(true);
            setEditando(kpiVazio(filtroCargo || banco.cargos[0].id));
          }}
        >
          + Novo KPI
        </button>
        <select value={filtroCargo} onChange={(e) => setFiltroCargo(e.target.value)}>
          <option value="">Todos os cargos</option>
          {banco.cargos.map((c) => (
            <option key={c.id} value={c.id}>
              {chaveCargo(c)}
            </option>
          ))}
        </select>
      </div>

      <div className="cartao" style={{ marginBottom: 12 }}>
        <strong>Teste de controlabilidade.</strong>{" "}
        <span className="sub">
          KPI cuja alavanca o ocupante não controla não pode ser usado para
          cobrança nem como base de remuneração variável — apenas
          acompanhamento. Cobrar margem de quem não decide preço produz
          desengajamento, não performance.
        </span>
        {invalidos.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Badge tom="critico">
              {invalidos.length} KPI(s) com uso incompatível com a controlabilidade
            </Badge>
          </div>
        )}
      </div>

      <div className="cartao rolagem-x">
        {lista.length === 0 ? (
          <Vazio>Nenhum KPI cadastrado para este filtro.</Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Cargo</th>
                <th>KPI</th>
                <th>Fonte</th>
                <th>Meta</th>
                <th>Periodicidade</th>
                <th>Controla?</th>
                <th>Uso</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((k) => (
                <tr
                  key={k.id}
                  className="clicavel"
                  onClick={() => {
                    setEhNovo(false);
                    setEditando({ ...k });
                  }}
                >
                  <td>{nomeCargo(k.cargoId)}</td>
                  <td style={{ maxWidth: 260 }}>
                    <div className="principal">{k.nome}</div>
                    <div className="secundario">{k.definicao}</div>
                  </td>
                  <td>{k.fonte}</td>
                  <td>{k.meta || "—"}</td>
                  <td>{k.periodicidade}</td>
                  <td>
                    <Badge tom={TOM_CONTROLA[k.controla]}>{k.controla}</Badge>
                  </td>
                  <td>
                    {usoKpiValido(k) ? (
                      k.uso
                    ) : (
                      <Badge tom="critico">{k.uso} — incompatível</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        titulo={ehNovo ? "Novo KPI" : "Editar KPI"}
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
      >
        {editando && (
          <>
            <div className="form-grade">
              <Campo label="Cargo" largo>
                <select
                  value={editando.cargoId}
                  onChange={(e) => editar("cargoId", e.target.value)}
                >
                  {banco.cargos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {chaveCargo(c)}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="KPI" largo>
                <input
                  value={editando.nome}
                  onChange={(e) => editar("nome", e.target.value)}
                  autoFocus={ehNovo}
                />
              </Campo>
              <Campo label="Definição / fórmula" largo>
                <input
                  value={editando.definicao}
                  onChange={(e) => editar("definicao", e.target.value)}
                />
              </Campo>
              <Campo label="Fonte do dado">
                <input
                  value={editando.fonte}
                  onChange={(e) => editar("fonte", e.target.value)}
                  placeholder="ERP / DWLR"
                />
              </Campo>
              <Campo label="Meta">
                <input
                  value={editando.meta}
                  onChange={(e) => editar("meta", e.target.value)}
                  placeholder="≥ 95%"
                />
              </Campo>
              <Campo label="Periodicidade">
                <select
                  value={editando.periodicidade}
                  onChange={(e) => editar("periodicidade", e.target.value)}
                >
                  {FREQUENCIAS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="O ocupante controla a alavanca?">
                <select
                  value={editando.controla}
                  onChange={(e) => editar("controla", e.target.value)}
                >
                  <option>Sim</option>
                  <option>Parcial</option>
                  <option>Não</option>
                </select>
              </Campo>
              <Campo label="Uso permitido">
                <select
                  value={editando.uso}
                  onChange={(e) => editar("uso", e.target.value)}
                >
                  {USOS_KPI.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Peso (%)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editando.peso || ""}
                  onChange={(e) => editar("peso", Number(e.target.value))}
                />
              </Campo>
              <Campo label="Observação" largo>
                <input
                  value={editando.observacao}
                  onChange={(e) => editar("observacao", e.target.value)}
                />
              </Campo>
            </div>

            {!usoKpiValido(editando) && (
              <p className="sub" style={{ color: "var(--st-bad-text)" }}>
                Controlabilidade “{editando.controla}” não comporta o uso “
                {editando.uso}”. Indicador fora do controle do ocupante só pode
                ser acompanhamento.
              </p>
            )}

            <div className="modal-acoes">
              {!ehNovo && (
                <button className="botao perigo" onClick={excluir}>
                  Excluir
                </button>
              )}
              <button className="botao" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button
                className="botao primario"
                onClick={salvar}
                disabled={!editando.nome.trim()}
              >
                Salvar
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------- Trilha

function degrauVazio(eixo: EixoTrilha): DegrauTrilha {
  return {
    id: novoId("t"),
    eixo,
    nivel: "",
    cargoReferencia: "",
    demonstrar: "",
    tempoMinimoMeses: 12,
    criterioPromocao: "",
    proximoTecnico: "",
    proximoGestao: "",
  };
}

function Trilha({ dados }: { dados: Dados }) {
  const { banco, atualizar } = dados;
  const [editando, setEditando] = useState<DegrauTrilha | null>(null);
  const [ehNovo, setEhNovo] = useState(false);

  const porEixo = (eixo: EixoTrilha) =>
    banco.trilha.filter((d) => d.eixo === eixo).sort((a, b) => a.nivel.localeCompare(b.nivel));

  const salvar = () => {
    if (!editando || !editando.nivel.trim()) return;
    atualizar((b) => ({
      ...b,
      trilha: ehNovo
        ? [...b.trilha, editando]
        : b.trilha.map((d) => (d.id === editando.id ? editando : d)),
    }));
    setEditando(null);
  };

  const excluir = () => {
    if (!editando || !window.confirm("Excluir este degrau?")) return;
    atualizar((b) => ({ ...b, trilha: b.trilha.filter((d) => d.id !== editando.id) }));
    setEditando(null);
  };

  const editar = (campo: keyof DegrauTrilha, valor: unknown) =>
    setEditando((d) => (d ? { ...d, [campo]: valor } : d));

  const pessoasNoEixo = (eixo: EixoTrilha) =>
    banco.pessoas.filter((p) => p.trilhaEixo === eixo && p.status !== "Desligado").length;

  return (
    <>
      <div className="cartao" style={{ marginBottom: 12 }}>
        <strong>Dois eixos, mesmo valor.</strong>{" "}
        <span className="sub">
          Promover um bom técnico para gestão sem perfil custa duas coisas: um
          mau gestor e um bom técnico a menos. O eixo técnico precisa de teto
          salarial competitivo, ou vira só sala de espera para a gestão.
        </span>
      </div>

      <div className="filtros">
        <button
          className="botao primario"
          onClick={() => {
            setEhNovo(true);
            setEditando(degrauVazio("Técnico"));
          }}
        >
          + Novo degrau
        </button>
      </div>

      {(["Técnico", "Gestão"] as EixoTrilha[]).map((eixo) => (
        <div className="cartao rolagem-x" key={eixo} style={{ marginBottom: 12 }}>
          <h2 style={{ marginTop: 0, fontSize: 15 }}>
            Eixo {eixo}{" "}
            <span className="sub">
              · {pessoasNoEixo(eixo)} pessoa(s) posicionadas neste eixo
            </span>
          </h2>
          {porEixo(eixo).length === 0 ? (
            <Vazio>Sem degraus definidos neste eixo.</Vazio>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Nível</th>
                  <th>Cargo de referência</th>
                  <th>O que precisa demonstrar</th>
                  <th className="num">Tempo mín.</th>
                  <th>Critério objetivo de promoção</th>
                  <th>Próximo passo</th>
                </tr>
              </thead>
              <tbody>
                {porEixo(eixo).map((d) => (
                  <tr
                    key={d.id}
                    className="clicavel"
                    onClick={() => {
                      setEhNovo(false);
                      setEditando({ ...d });
                    }}
                  >
                    <td>
                      <strong>{d.nivel}</strong>
                    </td>
                    <td>{d.cargoReferencia}</td>
                    <td style={{ maxWidth: 260 }}>
                      <div className="secundario">{d.demonstrar}</div>
                    </td>
                    <td className="num">
                      {d.tempoMinimoMeses ? `${d.tempoMinimoMeses} m` : "—"}
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      <div className="secundario">{d.criterioPromocao}</div>
                    </td>
                    <td>
                      <div className="secundario">
                        Técnico: {d.proximoTecnico || "—"}
                        <br />
                        Gestão: {d.proximoGestao || "—"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      <Modal
        titulo={ehNovo ? "Novo degrau" : "Editar degrau"}
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
      >
        {editando && (
          <>
            <div className="form-grade">
              <Campo label="Eixo">
                <select
                  value={editando.eixo}
                  onChange={(e) => editar("eixo", e.target.value as EixoTrilha)}
                >
                  <option>Técnico</option>
                  <option>Gestão</option>
                </select>
              </Campo>
              <Campo label="Nível">
                <input
                  value={editando.nivel}
                  onChange={(e) => editar("nivel", e.target.value)}
                  placeholder="T3 / G1"
                  autoFocus={ehNovo}
                />
              </Campo>
              <Campo label="Cargo de referência" largo>
                <input
                  value={editando.cargoReferencia}
                  onChange={(e) => editar("cargoReferencia", e.target.value)}
                />
              </Campo>
              <Campo label="O que a pessoa precisa demonstrar" largo>
                <textarea
                  rows={2}
                  value={editando.demonstrar}
                  onChange={(e) => editar("demonstrar", e.target.value)}
                />
              </Campo>
              <Campo label="Tempo mínimo no nível (meses)">
                <input
                  type="number"
                  min={0}
                  value={editando.tempoMinimoMeses || ""}
                  onChange={(e) => editar("tempoMinimoMeses", Number(e.target.value))}
                />
              </Campo>
              <Campo label="Critério objetivo de promoção" largo>
                <textarea
                  rows={2}
                  value={editando.criterioPromocao}
                  onChange={(e) => editar("criterioPromocao", e.target.value)}
                />
              </Campo>
              <Campo label="Próximo passo — eixo técnico">
                <input
                  value={editando.proximoTecnico}
                  onChange={(e) => editar("proximoTecnico", e.target.value)}
                />
              </Campo>
              <Campo label="Próximo passo — eixo gestão">
                <input
                  value={editando.proximoGestao}
                  onChange={(e) => editar("proximoGestao", e.target.value)}
                />
              </Campo>
            </div>
            <div className="modal-acoes">
              {!ehNovo && (
                <button className="botao perigo" onClick={excluir}>
                  Excluir
                </button>
              )}
              <button className="botao" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button
                className="botao primario"
                onClick={salvar}
                disabled={!editando.nivel.trim()}
              >
                Salvar
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
