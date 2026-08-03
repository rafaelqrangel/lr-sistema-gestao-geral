import { useMemo, useState } from "react";
import type { Dados } from "../App";
import type { Nivel, Pessoa, Regime, StatusPessoa } from "../types";
import { Badge, Campo, Modal, Vazio, type TomBadge } from "../components/ui";
import { fmtData, hojeISO } from "../lib/datas";
import { situacaoFerias } from "../lib/ferias";
import { fmtBRL, novoId } from "../lib/formato";

const NIVEIS: Nivel[] = [
  "Estagiário", "Assistente", "Analista Júnior", "Analista Pleno",
  "Analista Sênior", "Especialista", "Coordenador", "Gerente",
];
const REGIMES: Regime[] = ["CLT", "PJ", "Estágio", "Aprendiz", "Terceiro"];
const STATUS: StatusPessoa[] = ["Ativo", "Férias", "Afastado", "Desligado"];

const TOM_STATUS: Record<StatusPessoa, TomBadge> = {
  Ativo: "bom",
  Férias: "neutro",
  Afastado: "atencao",
  Desligado: "neutro",
};

function pessoaVazia(): Pessoa {
  return {
    id: novoId("p"),
    nome: "",
    email: "",
    cargo: "",
    area: "",
    nivel: "Analista Pleno",
    regime: "CLT",
    dataAdmissao: hojeISO(),
    salario: 0,
    gestorId: null,
    status: "Ativo",
    atribuicoes: [],
    observacoes: "",
  };
}

export function Pessoas({ dados }: { dados: Dados }) {
  const { banco, atualizar } = dados;
  const [editando, setEditando] = useState<Pessoa | null>(null);
  const [ehNovo, setEhNovo] = useState(false);
  const [filtroArea, setFiltroArea] = useState("");
  const [busca, setBusca] = useState("");
  const [mostrarDesligados, setMostrarDesligados] = useState(false);

  const areas = useMemo(
    () => [...new Set(banco.pessoas.map((p) => p.area).filter(Boolean))].sort(),
    [banco.pessoas],
  );

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return banco.pessoas
      .filter((p) => (mostrarDesligados ? true : p.status !== "Desligado"))
      .filter((p) => (filtroArea ? p.area === filtroArea : true))
      .filter((p) =>
        termo
          ? [p.nome, p.cargo, p.area, ...p.atribuicoes].join(" ").toLowerCase().includes(termo)
          : true,
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [banco.pessoas, filtroArea, busca, mostrarDesligados]);

  const salvar = () => {
    if (!editando || !editando.nome.trim()) return;
    atualizar((b) => ({
      ...b,
      pessoas: ehNovo
        ? [...b.pessoas, editando]
        : b.pessoas.map((p) => (p.id === editando.id ? editando : p)),
    }));
    setEditando(null);
  };

  const excluir = () => {
    if (!editando) return;
    const temVinculos =
      banco.ferias.some((f) => f.pessoaId === editando.id) ||
      banco.processos.some((p) => p.donoId === editando.id) ||
      banco.avaliacoes.some((a) => a.pessoaId === editando.id);
    const msg = temVinculos
      ? `${editando.nome} tem férias, processos ou avaliações vinculados, que também serão removidos. Excluir mesmo assim?\n\nDica: para preservar o histórico, use o status "Desligado" em vez de excluir.`
      : `Excluir ${editando.nome}?`;
    if (!window.confirm(msg)) return;
    atualizar((b) => ({
      ...b,
      pessoas: b.pessoas.map((p) =>
        p.gestorId === editando.id ? { ...p, gestorId: null } : p,
      ).filter((p) => p.id !== editando.id),
      ferias: b.ferias.filter((f) => f.pessoaId !== editando.id),
      avaliacoes: b.avaliacoes.filter((a) => a.pessoaId !== editando.id),
      processos: b.processos.map((pr) => ({
        ...pr,
        donoId: pr.donoId === editando.id ? null : pr.donoId,
        backupId: pr.backupId === editando.id ? null : pr.backupId,
      })),
      aprovacoes: b.aprovacoes.map((a) => ({
        ...a,
        solicitanteId: a.solicitanteId === editando.id ? null : a.solicitanteId,
      })),
    }));
    setEditando(null);
  };

  const editar = (campo: keyof Pessoa, valor: unknown) =>
    setEditando((p) => (p ? { ...p, [campo]: valor } : p));

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Pessoas</h1>
        <div className="espaco" />
        <button
          className="botao primario"
          onClick={() => {
            setEhNovo(true);
            setEditando(pessoaVazia());
          }}
        >
          + Nova pessoa
        </button>
        <div className="sub">
          Cadastro da equipe: cargo, salário, atribuições e situação de férias.
        </div>
      </div>

      <div className="filtros">
        <input
          placeholder="Buscar por nome, cargo ou atribuição…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}>
          <option value="">Todas as áreas</option>
          {areas.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={mostrarDesligados}
            onChange={(e) => setMostrarDesligados(e.target.checked)}
          />
          incluir desligados
        </label>
      </div>

      <div className="cartao rolagem-x">
        {lista.length === 0 ? (
          <Vazio>Nenhuma pessoa encontrada com esses filtros.</Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Área</th>
                <th>Nível / Regime</th>
                <th className="num">Salário</th>
                <th>Admissão</th>
                <th>Status</th>
                <th>Atribuições</th>
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
                  <td>
                    <div className="principal">{p.nome}</div>
                    <div className="secundario">{p.cargo}</div>
                  </td>
                  <td>{p.area || "—"}</td>
                  <td>
                    <div>{p.nivel}</div>
                    <div className="secundario">{p.regime}</div>
                  </td>
                  <td className="num">{fmtBRL(p.salario)}</td>
                  <td>{fmtData(p.dataAdmissao)}</td>
                  <td>
                    <Badge tom={TOM_STATUS[p.status]}>{p.status}</Badge>
                  </td>
                  <td style={{ maxWidth: 260 }}>
                    <div className="chips-atribuicoes">
                      {p.atribuicoes.slice(0, 3).map((a, i) => (
                        <span key={i} className="chip">{a}</span>
                      ))}
                      {p.atribuicoes.length > 3 && (
                        <span className="chip">+{p.atribuicoes.length - 3}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        titulo={ehNovo ? "Nova pessoa" : `Editar — ${editando?.nome || ""}`}
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
      >
        {editando && (
          <>
            <div className="form-grade">
              <Campo label="Nome completo" largo>
                <input
                  value={editando.nome}
                  onChange={(e) => editar("nome", e.target.value)}
                  autoFocus={ehNovo}
                />
              </Campo>
              <Campo label="E-mail">
                <input value={editando.email} onChange={(e) => editar("email", e.target.value)} />
              </Campo>
              <Campo label="Cargo">
                <input value={editando.cargo} onChange={(e) => editar("cargo", e.target.value)} />
              </Campo>
              <Campo label="Área">
                <input
                  value={editando.area}
                  onChange={(e) => editar("area", e.target.value)}
                  list="lista-areas"
                />
                <datalist id="lista-areas">
                  {areas.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </Campo>
              <Campo label="Nível">
                <select
                  value={editando.nivel}
                  onChange={(e) => editar("nivel", e.target.value as Nivel)}
                >
                  {NIVEIS.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Regime">
                <select
                  value={editando.regime}
                  onChange={(e) => editar("regime", e.target.value as Regime)}
                >
                  {REGIMES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Data de admissão">
                <input
                  type="date"
                  value={editando.dataAdmissao}
                  onChange={(e) => editar("dataAdmissao", e.target.value)}
                />
              </Campo>
              <Campo label="Salário mensal (R$)">
                <input
                  type="number"
                  min={0}
                  value={editando.salario || ""}
                  onChange={(e) => editar("salario", Number(e.target.value))}
                />
              </Campo>
              <Campo label="Gestor direto">
                <select
                  value={editando.gestorId ?? ""}
                  onChange={(e) => editar("gestorId", e.target.value || null)}
                >
                  <option value="">Eu (usuário do painel)</option>
                  {banco.pessoas
                    .filter((p) => p.id !== editando.id && p.status !== "Desligado")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                </select>
              </Campo>
              <Campo label="Status">
                <select
                  value={editando.status}
                  onChange={(e) => editar("status", e.target.value as StatusPessoa)}
                >
                  {STATUS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Atribuições (uma por linha)" largo>
                <textarea
                  rows={4}
                  value={editando.atribuicoes.join("\n")}
                  onChange={(e) =>
                    editar(
                      "atribuicoes",
                      e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                    )
                  }
                  placeholder={"Ex.:\nFechamento mensal de vendas\nGestão da carteira de clientes-chave"}
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

            {!ehNovo && editando.regime === "CLT" && editando.status !== "Desligado" && (
              <ResumoFerias dados={dados} pessoa={editando} />
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
              <button className="botao primario" onClick={salvar} disabled={!editando.nome.trim()}>
                Salvar
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

function ResumoFerias({ dados, pessoa }: { dados: Dados; pessoa: Pessoa }) {
  const s = situacaoFerias(
    pessoa,
    dados.banco.ferias.filter((f) => f.pessoaId === pessoa.id),
  );
  return (
    <div className="aviso-legal">
      <strong>Férias:</strong>{" "}
      {s.emAquisicao
        ? `em aquisição do primeiro período — ${s.diasDireito} dias proporcionais até agora.`
        : `saldo de ${s.saldo} dias do período ${fmtData(s.aquisitivoInicio)} → ${fmtData(s.aquisitivoFim)}; limite legal para gozo: ${fmtData(s.limiteGozo)} (${s.risco}).`}
    </div>
  );
}
