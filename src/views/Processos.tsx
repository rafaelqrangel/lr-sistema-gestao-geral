/**
 * Processos e rotinas.
 *
 * Cada processo recorrente carrega a próxima ocorrência, o prazo final de
 * execução e a antecedência do lembrete — é isso que alimenta o calendário
 * e os avisos da visão geral. As atas de cada ocorrência ficam aqui,
 * versionadas por processo e prontas para baixar ou enviar.
 */

import { useMemo, useState } from "react";
import type { Dados } from "../App";
import type { Ata, Criticidade, Frequencia, Processo, StatusProcesso } from "../types";
import { Badge, Campo, Modal, Vazio, type TomBadge } from "../components/ui";
import { diasEntre, fmtData, fmtDataCurta, fmtPrazo, hojeISO, somarDias } from "../lib/datas";
import { avancarProcesso } from "../lib/agenda";
import { ataParaEmail, baixarAta, nomeArquivoAta, pastaDoProcesso } from "../lib/atas";
import { novoId } from "../lib/formato";

const FREQUENCIAS: Frequencia[] = [
  "Diária", "Semanal", "Quinzenal", "Mensal", "Trimestral", "Semestral", "Anual", "Sob demanda",
];
const CRITICIDADES: Criticidade[] = ["Baixa", "Média", "Alta", "Crítica"];
const STATUS: StatusProcesso[] = ["Em dia", "Em risco", "Atrasado", "Parado"];

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
    proximaExecucao: hojeISO(),
    horario: "",
    diasParaPrazo: 0,
    lembreteDiasAntes: 1,
    participantesIds: [],
    documentado: false,
    link: "",
  };
}

function ataVazia(processo: Processo): Ata {
  return {
    id: novoId("at"),
    processoId: processo.id,
    data: processo.proximaExecucao ?? hojeISO(),
    titulo: processo.nome,
    participantesIds: [...processo.participantesIds],
    participantesExternos: "",
    pauta: "",
    decisoes: "",
    encaminhamentos: "",
    observacoes: "",
    caminhoGit: null,
    sincronizadaEm: null,
  };
}

export function Processos({ dados }: { dados: Dados }) {
  const { banco, atualizar } = dados;
  const [editando, setEditando] = useState<Processo | null>(null);
  const [ehNovo, setEhNovo] = useState(false);
  const [filtroDono, setFiltroDono] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [atasDe, setAtasDe] = useState<Processo | null>(null);

  const hoje = hojeISO();
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
    if (!editando) return;
    const atas = banco.atas.filter((a) => a.processoId === editando.id).length;
    const aviso = atas
      ? `Excluir "${editando.nome}"? As ${atas} ata(s) registradas também serão removidas do painel (as já sincronizadas seguem no GitHub).`
      : `Excluir o processo "${editando.nome}"?`;
    if (!window.confirm(aviso)) return;
    atualizar((b) => ({
      ...b,
      processos: b.processos.filter((p) => p.id !== editando.id),
      atas: b.atas.filter((a) => a.processoId !== editando.id),
    }));
    setEditando(null);
  };

  /** Marca a ocorrência como executada e joga a âncora para a próxima. */
  const marcarExecutado = (id: string) =>
    atualizar((b) => ({
      ...b,
      processos: b.processos.map((p) =>
        p.id === id ? { ...avancarProcesso(p, hoje), status: "Em dia" } : p,
      ),
    }));

  const editar = (campo: keyof Processo, valor: unknown) =>
    setEditando((p) => (p ? { ...p, [campo]: valor } : p));

  const equipe = banco.pessoas.filter((p) => p.status !== "Desligado");

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Processos e rotinas</h1>
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
          Quem é dono de quê, quando cada rotina acontece, qual o prazo final e
          o que ficou decidido na última reunião.
          {(semBackup > 0 || semDocumentacao > 0) && (
            <>
              {" "}
              <strong>
                {semBackup > 0 && `${semBackup} processo(s) crítico(s) sem backup. `}
                {semDocumentacao > 0 && `${semDocumentacao} de alta criticidade sem POP.`}
              </strong>
            </>
          )}
        </div>
      </div>

      <div className="filtros">
        <select value={filtroDono} onChange={(e) => setFiltroDono(e.target.value)}>
          <option value="">Todos os donos</option>
          {equipe.map((p) => (
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
          <Vazio>Nenhum processo com esses filtros.</Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Processo</th>
                <th>Dono / Backup</th>
                <th>Frequência</th>
                <th>Próxima</th>
                <th>Prazo final</th>
                <th>Cobrança</th>
                <th>Criticidade</th>
                <th>Atas</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const prazoFinal = p.proximaExecucao
                  ? somarDias(p.proximaExecucao, p.diasParaPrazo)
                  : null;
                const atrasado = prazoFinal ? diasEntre(prazoFinal, hoje) > 0 : false;
                const atas = banco.atas.filter((a) => a.processoId === p.id).length;
                return (
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
                      <div className="secundario">{p.horario || "dia inteiro"}</div>
                    </td>
                    <td>
                      {p.proximaExecucao ? (
                        <>
                          <div>{fmtDataCurta(p.proximaExecucao)}</div>
                          <div className="secundario">{fmtPrazo(p.proximaExecucao)}</div>
                        </>
                      ) : (
                        <span className="secundario">—</span>
                      )}
                    </td>
                    <td>
                      {prazoFinal ? (
                        <Badge tom={atrasado ? "critico" : "neutro"}>
                          {fmtDataCurta(prazoFinal)}
                        </Badge>
                      ) : (
                        <span className="secundario">{p.prazo || "—"}</span>
                      )}
                    </td>
                    <td style={{ maxWidth: 180 }}>
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
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="botao mini" onClick={() => setAtasDe(p)}>
                        📄 {atas}
                      </button>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className="botao mini"
                        title="Registrar execução e avançar para a próxima ocorrência"
                        onClick={() => marcarExecutado(p.id)}
                      >
                        ✓ Executado
                      </button>
                    </td>
                  </tr>
                );
              })}
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
                  placeholder="Ex.: Reunião semanal de resultado"
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
              <Campo label="Próxima ocorrência">
                <input
                  type="date"
                  value={editando.proximaExecucao ?? ""}
                  onChange={(e) => editar("proximaExecucao", e.target.value || null)}
                />
              </Campo>
              <Campo label="Horário">
                <input
                  type="time"
                  value={editando.horario}
                  onChange={(e) => editar("horario", e.target.value)}
                />
              </Campo>
              <Campo label="Prazo final: dias após a ocorrência">
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={editando.diasParaPrazo}
                  onChange={(e) => editar("diasParaPrazo", Number(e.target.value))}
                />
              </Campo>
              <Campo label="Avisar com quantos dias de antecedência">
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={editando.lembreteDiasAntes}
                  onChange={(e) => editar("lembreteDiasAntes", Number(e.target.value))}
                />
              </Campo>
              <Campo label="Dono (quem responde)">
                <select
                  value={editando.donoId ?? ""}
                  onChange={(e) => editar("donoId", e.target.value || null)}
                >
                  <option value="">— sem dono definido —</option>
                  {equipe.map((p) => (
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
                  {equipe
                    .filter((p) => p.id !== editando.donoId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                </select>
              </Campo>
              <Campo label="Participantes recorrentes" largo>
                <div className="caixa-checks">
                  {equipe.map((p) => (
                    <label key={p.id}>
                      <input
                        type="checkbox"
                        checked={editando.participantesIds.includes(p.id)}
                        onChange={(e) =>
                          editar(
                            "participantesIds",
                            e.target.checked
                              ? [...editando.participantesIds, p.id]
                              : editando.participantesIds.filter((i) => i !== p.id),
                          )
                        }
                      />
                      {p.nome}
                    </label>
                  ))}
                </div>
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
              <Campo label="Prazo acordado (texto)">
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

      {atasDe && (
        <PainelAtas
          dados={dados}
          processo={atasDe}
          aoFechar={() => setAtasDe(null)}
        />
      )}
    </>
  );
}

// ------------------------------------------------------------------ Atas

function PainelAtas({
  dados,
  processo,
  aoFechar,
}: {
  dados: Dados;
  processo: Processo;
  aoFechar: () => void;
}) {
  const { banco, atualizar } = dados;
  const [editando, setEditando] = useState<Ata | null>(null);
  const [ehNovo, setEhNovo] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const atas = banco.atas
    .filter((a) => a.processoId === processo.id)
    .sort((a, b) => b.data.localeCompare(a.data));

  const nomeDe = (id: string) => banco.pessoas.find((p) => p.id === id)?.nome ?? id;

  const salvar = () => {
    if (!editando) return;
    atualizar((b) => ({
      ...b,
      atas: ehNovo
        ? [...b.atas, editando]
        : b.atas.map((a) => (a.id === editando.id ? editando : a)),
    }));
    setEditando(null);
  };

  const excluir = () => {
    if (!editando || !window.confirm("Excluir esta ata do painel?")) return;
    atualizar((b) => ({ ...b, atas: b.atas.filter((a) => a.id !== editando.id) }));
    setEditando(null);
  };

  const editar = (campo: keyof Ata, valor: unknown) =>
    setEditando((a) => (a ? { ...a, [campo]: valor } : a));

  const copiarParaEmail = async (ata: Ata) => {
    const texto = ataParaEmail(ata, processo, banco.pessoas);
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const area = document.createElement("textarea");
      area.value = texto;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  };

  const equipe = banco.pessoas.filter((p) => p.status !== "Desligado");
  const pasta = `${banco.git.pasta}/atas/${pastaDoProcesso(processo, processo.id)}`;

  return (
    <>
      <Modal titulo={`Atas — ${processo.nome}`} aberto={editando === null} aoFechar={aoFechar}>
        <p className="sub" style={{ marginTop: 0 }}>
          Cada ata vira um arquivo Markdown em <code>{pasta}/</code> quando você
          sincroniza com o GitHub — o histórico fica versionado por processo e
          pode ser baixado a qualquer momento.
        </p>

        <div className="filtros">
          <button
            className="botao primario"
            onClick={() => {
              setEhNovo(true);
              setEditando(ataVazia(processo));
            }}
          >
            + Nova ata
          </button>
          {copiado && <span className="sub">Texto copiado ✓</span>}
        </div>

        {atas.length === 0 ? (
          <Vazio>Nenhuma ata registrada para este processo.</Vazio>
        ) : (
          <div className="rolagem-x">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Participantes</th>
                  <th>Decisões</th>
                  <th>GitHub</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {atas.map((a) => (
                  <tr key={a.id}>
                    <td>{fmtData(a.data)}</td>
                    <td className="secundario">
                      {a.participantesIds.length + (a.participantesExternos ? 1 : 0)} pessoa(s)
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      <div className="secundario">
                        {a.decisoes.slice(0, 120) || "—"}
                      </div>
                    </td>
                    <td>
                      {a.sincronizadaEm ? (
                        <Badge tom="bom">sincronizada</Badge>
                      ) : (
                        <Badge tom="neutro">só local</Badge>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          className="botao mini"
                          onClick={() => {
                            setEhNovo(false);
                            setEditando({ ...a });
                          }}
                        >
                          Abrir
                        </button>
                        <button
                          className="botao mini"
                          onClick={() => baixarAta(a, processo, banco.pessoas)}
                          title={nomeArquivoAta(a, processo)}
                        >
                          ⬇ .md
                        </button>
                        <button className="botao mini" onClick={() => copiarParaEmail(a)}>
                          ✉ Copiar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-acoes">
          <button className="botao" onClick={aoFechar}>
            Fechar
          </button>
        </div>
      </Modal>

      <Modal
        titulo={ehNovo ? "Nova ata" : "Editar ata"}
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
      >
        {editando && (
          <>
            <div className="form-grade">
              <Campo label="Data da reunião">
                <input
                  type="date"
                  value={editando.data}
                  onChange={(e) => editar("data", e.target.value)}
                />
              </Campo>
              <Campo label="Título">
                <input
                  value={editando.titulo}
                  onChange={(e) => editar("titulo", e.target.value)}
                />
              </Campo>
              <Campo label="Participantes" largo>
                <div className="caixa-checks">
                  {equipe.map((p) => (
                    <label key={p.id}>
                      <input
                        type="checkbox"
                        checked={editando.participantesIds.includes(p.id)}
                        onChange={(e) =>
                          editar(
                            "participantesIds",
                            e.target.checked
                              ? [...editando.participantesIds, p.id]
                              : editando.participantesIds.filter((i) => i !== p.id),
                          )
                        }
                      />
                      {p.nome}
                    </label>
                  ))}
                </div>
              </Campo>
              <Campo label="Participantes externos (separados por vírgula)" largo>
                <input
                  value={editando.participantesExternos}
                  onChange={(e) => editar("participantesExternos", e.target.value)}
                />
              </Campo>
              <Campo label="Pauta" largo>
                <textarea
                  rows={3}
                  value={editando.pauta}
                  onChange={(e) => editar("pauta", e.target.value)}
                />
              </Campo>
              <Campo label="Decisões" largo>
                <textarea
                  rows={4}
                  value={editando.decisoes}
                  onChange={(e) => editar("decisoes", e.target.value)}
                  placeholder="O que ficou decidido nesta reunião."
                />
              </Campo>
              <Campo label="Encaminhamentos — um por linha: o quê — quem — quando" largo>
                <textarea
                  rows={4}
                  value={editando.encaminhamentos}
                  onChange={(e) => editar("encaminhamentos", e.target.value)}
                  placeholder={"Enviar plano do Grupo Mateus — Carlos — até sexta"}
                />
              </Campo>
              <Campo label="Observações" largo>
                <textarea
                  rows={2}
                  value={editando.observacoes}
                  onChange={(e) => editar("observacoes", e.target.value)}
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
                onClick={() => baixarAta(editando, processo, banco.pessoas)}
              >
                ⬇ Baixar .md
              </button>
              <button className="botao" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button className="botao primario" onClick={salvar}>
                Salvar
              </button>
            </div>

            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: "pointer" }}>Pré-visualizar o texto</summary>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                  background: "var(--fundo-2)",
                  padding: 12,
                  borderRadius: 8,
                  maxHeight: 240,
                  overflow: "auto",
                }}
              >
                {ataParaEmail(editando, processo, banco.pessoas)}
              </pre>
            </details>

            {editando.participantesIds.length > 0 && (
              <p className="sub">
                Vai para: {editando.participantesIds.map(nomeDe).join(", ")}
                {editando.participantesExternos ? `, ${editando.participantesExternos}` : ""}
              </p>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
