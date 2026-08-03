import { useMemo, useState } from "react";
import type { Dados } from "../App";
import type { Aprovacao, StatusAprovacao, TipoAprovacao } from "../types";
import { Badge, Campo, Modal, Vazio, type TomBadge } from "../components/ui";
import { diasEntre, fmtDataCurta, fmtPrazo, hojeISO, somarDias } from "../lib/datas";
import { fmtBRLCentavos, novoId } from "../lib/formato";
import { interpretarEmail, PROMPT_COPILOT } from "../lib/importarEmail";

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
    recorrenciaDias: 0,
  };
}

/** Modelo pronto da rotina semanal de revisão do Uber Business. */
function rotinaUber(): Aprovacao {
  return {
    ...aprovacaoVazia(),
    tipo: "Mobilidade (Uber/táxi)",
    descricao: "Revisão semanal — corridas Uber Business da equipe",
    prazoResposta: somarDias(hojeISO(), 4),
    recorrenciaDias: 7,
    observacao:
      "Abrir o link, revisar as corridas da semana no Uber e registrar a decisão aqui — a próxima semana entra na fila sozinha.",
  };
}

const OPCOES_RECORRENCIA: { valor: number; rotulo: string }[] = [
  { valor: 0, rotulo: "Não repete" },
  { valor: 7, rotulo: "Toda semana" },
  { valor: 14, rotulo: "A cada 2 semanas" },
  { valor: 30, rotulo: "Todo mês" },
];

function rotuloRecorrencia(dias: number): string {
  return (
    OPCOES_RECORRENCIA.find((o) => o.valor === dias)?.rotulo ??
    `A cada ${dias} dias`
  );
}

/**
 * Ao decidir uma solicitação recorrente, agenda a próxima ocorrência a
 * partir do dia da decisão (evita fila retroativa se uma semana atrasar).
 */
function comProximaOcorrencia(lista: Aprovacao[], decidida: Aprovacao): Aprovacao[] {
  const rec = decidida.recorrenciaDias ?? 0;
  if (rec <= 0) return lista;
  const hoje = hojeISO();
  return [
    ...lista,
    {
      ...decidida,
      id: novoId("a"),
      status: "Pendente",
      dataDecisao: null,
      dataSolicitacao: hoje,
      prazoResposta: somarDias(hoje, rec),
    },
  ];
}

export function Aprovacoes({ dados }: { dados: Dados }) {
  const { banco, atualizar } = dados;
  const [editando, setEditando] = useState<Aprovacao | null>(null);
  const [ehNovo, setEhNovo] = useState(false);
  const [aba, setAba] = useState<"fila" | "historico">("fila");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [importAberto, setImportAberto] = useState(false);
  const [textoEmail, setTextoEmail] = useState("");
  const [notaImport, setNotaImport] = useState<string[] | null>(null);
  const [promptCopiado, setPromptCopiado] = useState(false);

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
    atualizar((b) => {
      const alvo = b.aprovacoes.find((a) => a.id === id);
      if (!alvo) return b;
      const decidida = { ...alvo, status, dataDecisao: hojeISO() };
      const lista = b.aprovacoes.map((a) => (a.id === id ? decidida : a));
      return { ...b, aprovacoes: comProximaOcorrencia(lista, decidida) };
    });

  const salvar = () => {
    if (!editando || !editando.descricao.trim()) return;
    const decidida = editando.status === "Aprovado" || editando.status === "Reprovado";
    const pronta = {
      ...editando,
      dataDecisao: decidida ? (editando.dataDecisao ?? hojeISO()) : null,
    };
    atualizar((b) => {
      const anterior = b.aprovacoes.find((a) => a.id === pronta.id);
      const jaEstavaDecidida =
        anterior?.status === "Aprovado" || anterior?.status === "Reprovado";
      const lista = ehNovo
        ? [...b.aprovacoes, pronta]
        : b.aprovacoes.map((a) => (a.id === pronta.id ? pronta : a));
      // Só agenda a próxima ocorrência na transição para decidida — editar
      // um item do histórico não pode duplicar a rotina.
      return {
        ...b,
        aprovacoes:
          decidida && !jaEstavaDecidida
            ? comProximaOcorrencia(lista, pronta)
            : lista,
      };
    });
    setEditando(null);
    setNotaImport(null);
  };

  const importar = () => {
    const resultado = interpretarEmail(textoEmail, banco.pessoas);
    setImportAberto(false);
    setTextoEmail("");
    setNotaImport(resultado.detectados);
    setEhNovo(true);
    setEditando(resultado.aprovacao);
  };

  const copiarPrompt = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT_COPILOT);
    } catch {
      // file:// sem permissão de clipboard — fallback via seleção.
      const area = document.createElement("textarea");
      area.value = PROMPT_COPILOT;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setPromptCopiado(true);
    window.setTimeout(() => setPromptCopiado(false), 2000);
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
          className="botao"
          title="Criar a revisão semanal das corridas do Uber Business"
          onClick={() => {
            setEhNovo(true);
            setNotaImport(null);
            setEditando(rotinaUber());
          }}
        >
          ↻ Rotina Uber
        </button>
        <button className="botao" onClick={() => setImportAberto(true)}>
          📥 Importar de e-mail
        </button>
        <button
          className="botao primario"
          onClick={() => {
            setEhNovo(true);
            setNotaImport(null);
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
                      setNotaImport(null);
                      setEditando({ ...a });
                    }}
                  >
                    <td style={{ maxWidth: 280 }}>
                      <div className="principal">
                        {a.tipo}
                        {(a.recorrenciaDias ?? 0) > 0 && (
                          <>
                            {" "}
                            <Badge tom="neutro">
                              ↻ {rotuloRecorrencia(a.recorrenciaDias!).toLowerCase()}
                            </Badge>
                          </>
                        )}
                      </div>
                      <div className="secundario">
                        {a.descricao}
                        {a.centroCusto ? ` · CC: ${a.centroCusto}` : ""}
                        {a.link && (
                          <>
                            {" · "}
                            <a
                              href={a.link}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              abrir link ↗
                            </a>
                          </>
                        )}
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
        titulo="Importar aprovação de e-mail"
        aberto={importAberto}
        aoFechar={() => setImportAberto(false)}
      >
        <p className="sub" style={{ marginTop: 0 }}>
          Cole abaixo o texto do e-mail (Ctrl+A e Ctrl+C na mensagem do
          Outlook) <strong>ou</strong> a resposta do Copilot. O painel
          interpreta e pré-preenche o formulário para você revisar.
        </p>
        <details style={{ marginBottom: 12 }}>
          <summary style={{ cursor: "pointer" }}>
            Usar o Copilot do Outlook (extração mais precisa)
          </summary>
          <p className="sub">
            Abra o e-mail, acione o Copilot e cole o prompt abaixo. Depois
            cole a resposta dele aqui no campo de texto.
          </p>
          <textarea
            readOnly
            value={PROMPT_COPILOT}
            rows={7}
            style={{ width: "100%", fontSize: 12 }}
          />
          <button className="botao mini" onClick={copiarPrompt}>
            {promptCopiado ? "Copiado ✓" : "Copiar prompt"}
          </button>
        </details>
        <textarea
          value={textoEmail}
          onChange={(e) => setTextoEmail(e.target.value)}
          rows={10}
          autoFocus
          placeholder="Cole aqui o e-mail ou a resposta do Copilot…"
          style={{ width: "100%" }}
        />
        <div className="modal-acoes">
          <button className="botao" onClick={() => setImportAberto(false)}>
            Cancelar
          </button>
          <button
            className="botao primario"
            onClick={importar}
            disabled={!textoEmail.trim()}
          >
            Interpretar e revisar
          </button>
        </div>
      </Modal>

      <Modal
        titulo={ehNovo ? "Nova solicitação" : "Editar solicitação"}
        aberto={editando !== null}
        aoFechar={() => {
          setEditando(null);
          setNotaImport(null);
        }}
      >
        {editando && (
          <>
            {notaImport && (
              <p className="sub" style={{ marginTop: 0 }}>
                {notaImport.length > 0
                  ? `Extraído do e-mail: ${notaImport.join(" · ")}. Confira antes de salvar.`
                  : "Não consegui extrair nada do texto colado — preencha manualmente."}
              </p>
            )}
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
              <Campo label="Repetir">
                <select
                  value={editando.recorrenciaDias ?? 0}
                  onChange={(e) => editar("recorrenciaDias", Number(e.target.value))}
                >
                  {OPCOES_RECORRENCIA.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.rotulo}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Link (comprovante, relatório, painel Uber)">
                <input
                  value={editando.link}
                  onChange={(e) => editar("link", e.target.value)}
                  placeholder="https:// — ex.: link do dashboard Uber Business"
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
              <button
                className="botao"
                onClick={() => {
                  setEditando(null);
                  setNotaImport(null);
                }}
              >
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
