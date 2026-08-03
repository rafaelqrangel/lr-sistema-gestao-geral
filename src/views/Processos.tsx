import { useMemo, useState } from "react";
import type { Dados } from "../App";
import type { Criticidade, Frequencia, Processo, StatusProcesso } from "../types";
import { Badge, Campo, Modal, Vazio, type TomBadge } from "../components/ui";
import { fmtDataCurta } from "../lib/datas";
import { novoId } from "../lib/formato";

const FREQUENCIAS: Frequencia[] = [
  "Diária", "Semanal", "Quinzenal", "Mensal", "Trimestral", "Semestral", "Anual", "Sob demanda",
];
const CRITICIDADES: Criticidade[] = ["Baixa", "Média", "Alta", "Crítica"];
const STATUS: StatusProcesso[] = ["Em dia", "Em risco", "Atrasado", "Parado"];

const TOM_STATUS: Record<StatusProcesso, TomBadge> = {
  "Em dia": "bom",
  "Em risco": "atencao",
  Atrasado: "serio",
  Parado: "critico",
};
const TOM_CRIT: Record<Criticidade, TomBadge> = {
  Baixa: "neutro",
  Média: "neutro",
  Alta: "atencao",
  Crítica: "critico",
};

function processoVazio(): Processo {
  return {
    id: novoId("pr"),
    nome: "",
    area: "",
    descricao: "",
    donoId: null,
    backupId: null,
    frequencia: "Mensal",
    criticidade: "Média",
    entregavel: "",
    prazo: "",
    indicador: "",
    meta: "",
    status: "Em dia",
    ultimaExecucao: null,
    documentado: false,
    link: "",
  };
}

export function Processos({ dados }: { dados: Dados }) {
  const { banco, atualizar } = dados;
  const [editando, setEditando] = useState<Processo | null>(null);
  const [ehNovo, setEhNovo] = useState(false);
  const [filtroDono, setFiltroDono] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const nomeDe = (id: string | null) =>
    banco.pessoas.find((p) => p.id === id)?.nome ?? "—";

  const lista = useMemo(() => {
    const ordem: Record<StatusProcesso, number> = {
      Parado: 0, Atrasado: 1, "Em risco": 2, "Em dia": 3,
    };
    const ordemCrit: Record<Criticidade, number> = {
      Crítica: 0, Alta: 1, Média: 2, Baixa: 3,
    };
    return banco.processos
      .filter((p) => (filtroDono ? p.donoId === filtroDono : true))
      .filter((p) => (filtroStatus ? p.status === filtroStatus : true))
      .sort(
        (a, b) =>
          ordem[a.status] - ordem[b.status] ||
          ordemCrit[a.criticidade] - ordemCrit[b.criticidade] ||
          a.nome.localeCompare(b.nome, "pt-BR"),
      );
  }, [banco.processos, filtroDono, filtroStatus]);

  const semDocumentacao = banco.processos.filter(
    (p) => !p.documentado && (p.criticidade === "Crítica" || p.criticidade === "Alta"),
  ).length;
  const semBackup = banco.processos.filter(
    (p) => p.criticidade === "Crítica" && !p.backupId,
  ).length;

  const salvar = () => {
    if (!editando || !editando.nome.trim()) return;
    atualizar((b) => ({
      ...b,
      processos: ehNovo
        ? [...b.processos, editando]
        : b.processos.map((p) => (p.id === editando.id ? editando : p)),
    }));
    setEditando(null);
  };

  const excluir = () => {
    if (!editando || !window.confirm(`Excluir o processo "${editando.nome}"?`)) return;
    atualizar((b) => ({
      ...b,
      processos: b.processos.filter((p) => p.id !== editando.id),
    }));
    setEditando(null);
  };

  const editar = (campo: keyof Processo, valor: unknown) =>
    setEditando((p) => (p ? { ...p, [campo]: valor } : p));

  const donos = banco.pessoas.filter((p) => p.status !== "Desligado");

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Processos</h1>
        <div className="espaco" />
        <button
          className="botao primario"
          onClick={() => {
            setEhNovo(true);
            setEditando(processoVazio());
          }}
        >
          + Novo processo
        </button>
        <div className="sub">
          O mapa de rotinas: quem é dono de quê, pelo que cada um é cobrado e onde
          está o risco de continuidade.
          {(semBackup > 0 || semDocumentacao > 0) && (
            <>
              {" "}
              <strong>
                {semBackup > 0 && `${semBackup} processo(s) crítico(s) sem backup. `}
                {semDocumentacao > 0 && `${semDocumentacao} de alta criticidade sem documentação.`}
              </strong>
            </>
          )}
        </div>
      </div>

      <div className="filtros">
        <select value={filtroDono} onChange={(e) => setFiltroDono(e.target.value)}>
          <option value="">Todos os donos</option>
          {donos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="cartao rolagem-x">
        {lista.length === 0 ? (
          <Vazio>Nenhum processo com esses filtros. Cadastre o primeiro em “+ Novo processo”.</Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Processo</th>
                <th>Dono / Backup</th>
                <th>Frequência</th>
                <th>Cobrança (indicador · meta)</th>
                <th>Criticidade</th>
                <th>Status</th>
                <th>Última execução</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr
                  key={p.id}
                  className="clicavel"
                  onClick={() => {
                    setEhNovo(false);
                    setEditando({ ...p });
                  }}
                >
                  <td style={{ maxWidth: 240 }}>
                    <div className="principal">{p.nome}</div>
                    <div className="secundario">
                      {p.area}
                      {p.entregavel ? ` · ${p.entregavel}` : ""}
                      {!p.documentado ? " · sem POP" : ""}
                    </div>
                  </td>
                  <td>
                    <div>{nomeDe(p.donoId)}</div>
                    <div className="secundario">
                      {p.backupId ? `backup: ${nomeDe(p.backupId)}` : "sem backup"}
                    </div>
                  </td>
                  <td>
                    <div>{p.frequencia}</div>
                    <div className="secundario">{p.prazo || "—"}</div>
                  </td>
                  <td style={{ maxWidth: 200 }}>
                    {p.indicador ? (
                      <>
                        <div>{p.indicador}</div>
                        <div className="secundario">meta: {p.meta || "—"}</div>
                      </>
                    ) : (
                      <span className="secundario">não definida</span>
                    )}
                  </td>
                  <td>
                    <Badge tom={TOM_CRIT[p.criticidade]}>{p.criticidade}</Badge>
                  </td>
                  <td>
                    <Badge tom={TOM_STATUS[p.status]}>{p.status}</Badge>
                  </td>
                  <td>{p.ultimaExecucao ? fmtDataCurta(p.ultimaExecucao) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        titulo={ehNovo ? "Novo processo" : `Editar — ${editando?.nome || ""}`}
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
      >
        {editando && (
          <>
            <div className="form-grade">
              <Campo label="Nome do processo" largo>
                <input
                  value={editando.nome}
                  onChange={(e) => editar("nome", e.target.value)}
                  autoFocus={ehNovo}
                  placeholder="Ex.: Fechamento mensal de vendas"
                />
              </Campo>
              <Campo label="Área">
                <input value={editando.area} onChange={(e) => editar("area", e.target.value)} />
              </Campo>
              <Campo label="Frequência">
                <select
                  value={editando.frequencia}
                  onChange={(e) => editar("frequencia", e.target.value as Frequencia)}
                >
                  {FREQUENCIAS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Dono (quem responde)">
                <select
                  value={editando.donoId ?? ""}
                  onChange={(e) => editar("donoId", e.target.value || null)}
                >
                  <option value="">— sem dono definido —</option>
                  {donos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Backup (substituto)">
                <select
                  value={editando.backupId ?? ""}
                  onChange={(e) => editar("backupId", e.target.value || null)}
                >
                  <option value="">— sem backup —</option>
                  {donos
                    .filter((p) => p.id !== editando.donoId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                </select>
              </Campo>
              <Campo label="Descrição" largo>
                <textarea
                  rows={2}
                  value={editando.descricao}
                  onChange={(e) => editar("descricao", e.target.value)}
                />
              </Campo>
              <Campo label="Entregável concreto">
                <input
                  value={editando.entregavel}
                  onChange={(e) => editar("entregavel", e.target.value)}
                  placeholder="Ex.: Relatório no Power BI"
                />
              </Campo>
              <Campo label="Prazo acordado">
                <input
                  value={editando.prazo}
                  onChange={(e) => editar("prazo", e.target.value)}
                  placeholder="Ex.: todo dia 5 útil"
                />
              </Campo>
              <Campo label="Indicador de cobrança">
                <input
                  value={editando.indicador}
                  onChange={(e) => editar("indicador", e.target.value)}
                  placeholder="Ex.: OTIF"
                />
              </Campo>
              <Campo label="Meta">
                <input
                  value={editando.meta}
                  onChange={(e) => editar("meta", e.target.value)}
                  placeholder="Ex.: ≥ 95%"
                />
              </Campo>
              <Campo label="Criticidade">
                <select
                  value={editando.criticidade}
                  onChange={(e) => editar("criticidade", e.target.value as Criticidade)}
                >
                  {CRITICIDADES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Status">
                <select
                  value={editando.status}
                  onChange={(e) => editar("status", e.target.value as StatusProcesso)}
                >
                  {STATUS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Última execução">
                <input
                  type="date"
                  value={editando.ultimaExecucao ?? ""}
                  onChange={(e) => editar("ultimaExecucao", e.target.value || null)}
                />
              </Campo>
              <Campo label="Link (POP, planilha, pasta)">
                <input
                  value={editando.link}
                  onChange={(e) => editar("link", e.target.value)}
                  placeholder="https://…"
                />
              </Campo>
              <Campo label=" ">
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={editando.documentado}
                    onChange={(e) => editar("documentado", e.target.checked)}
                  />
                  Processo documentado (POP escrito)
                </label>
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
