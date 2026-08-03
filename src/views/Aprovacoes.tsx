import { useMemo, useState } from "react";
import type { Dados } from "../App";
import type { Aprovacao, StatusAprovacao, TipoAprovacao } from "../types";
import { Badge, Campo, Modal, Vazio, type TomBadge } from "../components/ui";
import { diasEntre, fmtDataCurta, fmtPrazo, hojeISO, somarDias } from "../lib/datas";
import { fmtBRLCentavos, novoId } from "../lib/formato";

const TIPOS: TipoAprovacao[] = [
  "Viagem", "Mobilidade (Uber/táxi)", "Reembolso de despesa", "Orçamento",
  "Compra / Contrato", "Hora extra", "Desligamento / Contratação", "Outro",
];
const STATUS: StatusAprovacao[] = ["Pendente", "Em análise", "Aprovado", "Reprovado"];

const TOM_STATUS: Record<StatusAprovacao, TomBadge> = {
  Pendente: "atencao",
  "Em análise": "neutro",
  Aprovado: "bom",
  Reprovado: "critico",
};

function aprovacaoVazia(): Aprovacao {
  return {
    id: novoId("a"),
    tipo: "Reembolso de despesa",
    solicitanteId: null,
    descricao: "",
    valor: 0,
    dataSolicitacao: hojeISO(),
    prazoResposta: somarDias(hojeISO(), 5),
    status: "Pendente",
    dataDecisao: null,
    centroCusto: "",
    link: "",
    observacao: "",
  };
}

export function Aprovacoes({ dados }: { dados: Dados }) {
  const { banco, atualizar } = dados;
  const [editando, setEditando] = useState<Aprovacao | null>(null);
  const [ehNovo, setEhNovo] = useState(false);
  const [aba, setAba] = useState<"fila" | "historico">("fila");
  const [filtroTipo, setFiltroTipo] = useState("");

  const hoje = hojeISO();
  const nomeDe = (id: string | null) =>
    banco.pessoas.find((p) => p.id === id)?.nome ?? "—";

  const { fila, historico } = useMemo(() => {
    const filtradas = banco.aprovacoes.filter((a) =>
      filtroTipo ? a.tipo === filtroTipo : true,
    );
    return {
      fila: filtradas
        .filter((a) => a.status === "Pendente" || a.status === "Em análise")
        .sort((a, b) => a.prazoResposta.localeCompare(b.prazoResposta)),
      historico: filtradas
        .filter((a) => a.status === "Aprovado" || a.status === "Reprovado")
        .sort((a, b) => (b.dataDecisao ?? "").localeCompare(a.dataDecisao ?? "")),
    };
  }, [banco.aprovacoes, filtroTipo]);

  const decidir = (id: string, status: "Aprovado" | "Reprovado") =>
    atualizar((b) => ({
      ...b,
      aprovacoes: b.aprovacoes.map((a) =>
        a.id === id ? { ...a, status, dataDecisao: hojeISO() } : a,
      ),
    }));

  const salvar = () => {
    if (!editando || !editando.descricao.trim()) return;
    const decidida = editando.status === "Aprovado" || editando.status === "Reprovado";
    const pronta = {
      ...editando,
      dataDecisao: decidida ? (editando.dataDecisao ?? hojeISO()) : null,
    };
    atualizar((b) => ({
      ...b,
      aprovacoes: ehNovo
        ? [...b.aprovacoes, pronta]
        : b.aprovacoes.map((a) => (a.id === pronta.id ? pronta : a)),
    }));
    setEditando(null);
  };

  const excluir = () => {
    if (!editando || !window.confirm("Excluir esta solicitação?")) return;
    atualizar((b) => ({
      ...b,
      aprovacoes: b.aprovacoes.filter((a) => a.id !== editando.id),
    }));
    setEditando(null);
  };

  const editar = (campo: keyof Aprovacao, valor: unknown) =>
    setEditando((a) => (a ? { ...a, [campo]: valor } : a));

  const listaAtiva = aba === "fila" ? fila : historico;

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Aprovações</h1>
        <div className="espaco" />
        <button
          className="botao primario"
          onClick={() => {
            setEhNovo(true);
            setEditando(aprovacaoVazia());
          }}
        >
          + Nova solicitação
        </button>
        <div className="sub">
          Tudo que chega para você decidir: viagens, Uber, reembolsos, orçamentos e
          contratos. Aprove ou devolva sem caçar e-mail.
        </div>
      </div>

      <div className="filtros">
        <button
          className={`botao mini${aba === "fila" ? " primario" : ""}`}
          onClick={() => setAba("fila")}
        >
          Na fila ({fila.length})
        </button>
        <button
          className={`botao mini${aba === "historico" ? " primario" : ""}`}
          onClick={() => setAba("historico")}
        >
          Histórico ({historico.length})
        </button>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="cartao rolagem-x">
        {listaAtiva.length === 0 ? (
          <Vazio>
            {aba === "fila"
              ? "Nada aguardando decisão. 🎉"
              : "Nenhuma decisão registrada ainda."}
          </Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Solicitante</th>
                <th className="num">Valor</th>
                <th>{aba === "fila" ? "Prazo p/ decidir" : "Decidido em"}</th>
                <th>Status</th>
                {aba === "fila" && <th>Ação rápida</th>}
              </tr>
            </thead>
            <tbody>
              {listaAtiva.map((a) => {
                const atrasada =
                  aba === "fila" && diasEntre(a.prazoResposta, hoje) > 0;
                return (
                  <tr
                    key={a.id}
                    className="clicavel"
                    onClick={() => {
                      setEhNovo(false);
                      setEditando({ ...a });
                    }}
                  >
                    <td style={{ maxWidth: 280 }}>
                      <div className="principal">{a.tipo}</div>
                      <div className="secundario">
                        {a.descricao}
                        {a.centroCusto ? ` · CC: ${a.centroCusto}` : ""}
                      </div>
                    </td>
                    <td>{nomeDe(a.solicitanteId)}</td>
                    <td className="num">{fmtBRLCentavos(a.valor)}</td>
                    <td>
                      {aba === "fila" ? (
                        <Badge tom={atrasada ? "critico" : "neutro"}>
                          {fmtPrazo(a.prazoResposta)}
                        </Badge>
                      ) : (
                        fmtDataCurta(a.dataDecisao)
                      )}
                    </td>
                    <td>
                      <Badge tom={TOM_STATUS[a.status]}>{a.status}</Badge>
                    </td>
                    {aba === "fila" && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="botao mini"
                            style={{ color: "var(--st-good-text)" }}
                            onClick={() => decidir(a.id, "Aprovado")}
                          >
                            ✓ Aprovar
                          </button>
                          <button
                            className="botao mini perigo"
                            onClick={() => decidir(a.id, "Reprovado")}
                          >
                            ✕ Reprovar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        titulo={ehNovo ? "Nova solicitação" : "Editar solicitação"}
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
      >
        {editando && (
          <>
            <div className="form-grade">
              <Campo label="Tipo">
                <select
                  value={editando.tipo}
                  onChange={(e) => editar("tipo", e.target.value as TipoAprovacao)}
                >
                  {TIPOS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Solicitante">
                <select
                  value={editando.solicitanteId ?? ""}
                  onChange={(e) => editar("solicitanteId", e.target.value || null)}
                >
                  <option value="">—</option>
                  {banco.pessoas
                    .filter((p) => p.status !== "Desligado")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                </select>
              </Campo>
              <Campo label="Descrição" largo>
                <input
                  value={editando.descricao}
                  onChange={(e) => editar("descricao", e.target.value)}
                  autoFocus={ehNovo}
                  placeholder="Ex.: Visita a clientes em Recife — 2 diárias + aéreo"
                />
              </Campo>
              <Campo label="Valor (R$)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editando.valor || ""}
                  onChange={(e) => editar("valor", Number(e.target.value))}
                />
              </Campo>
              <Campo label="Centro de custo">
                <input
                  value={editando.centroCusto}
                  onChange={(e) => editar("centroCusto", e.target.value)}
                />
              </Campo>
              <Campo label="Data da solicitação">
                <input
                  type="date"
                  value={editando.dataSolicitacao}
                  onChange={(e) => editar("dataSolicitacao", e.target.value)}
                />
              </Campo>
              <Campo label="Prazo para sua resposta">
                <input
                  type="date"
                  value={editando.prazoResposta}
                  onChange={(e) => editar("prazoResposta", e.target.value)}
                />
              </Campo>
              <Campo label="Status">
                <select
                  value={editando.status}
                  onChange={(e) => editar("status", e.target.value as StatusAprovacao)}
                >
                  {STATUS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Link (comprovante, relatório)">
                <input
                  value={editando.link}
                  onChange={(e) => editar("link", e.target.value)}
                  placeholder="https://…"
                />
              </Campo>
              <Campo label="Observação" largo>
                <input
                  value={editando.observacao}
                  onChange={(e) => editar("observacao", e.target.value)}
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
                disabled={!editando.descricao.trim()}
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
