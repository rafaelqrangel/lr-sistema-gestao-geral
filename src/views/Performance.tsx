import { useMemo, useState } from "react";
import type { Dados } from "../App";
import type { Avaliacao, Competencias } from "../types";
import { COMPETENCIA_LABELS } from "../types";
import { Badge, Campo, Modal, Vazio, type TomBadge } from "../components/ui";
import { fmtDataCurta, hojeISO } from "../lib/datas";
import { fmtNota, novoId } from "../lib/formato";

function avaliacaoVazia(pessoaId: string): Avaliacao {
  const ano = new Date().getFullYear();
  const semestre = new Date().getMonth() < 6 ? "S1" : "S2";
  return {
    id: novoId("av"),
    pessoaId,
    ciclo: `${ano}-${semestre}`,
    competencias: { entrega: 3, qualidade: 3, colaboracao: 3, autonomia: 3, lideranca: 3 },
    resultado: 3,
    potencial: 2,
    data: hojeISO(),
    pontosFortes: "",
    pontosDesenvolver: "",
    planoAcao: "",
  };
}

function mediaCompetencias(c: Competencias): number {
  return (c.entrega + c.qualidade + c.colaboracao + c.autonomia + c.lideranca) / 5;
}

function tomNota(n: number): TomBadge {
  if (n >= 4) return "bom";
  if (n >= 3) return "neutro";
  if (n >= 2) return "atencao";
  return "critico";
}

/** Faixa 9-box do resultado: 1-2 baixo, 3 médio, 4-5 alto. */
function faixaResultado(r: number): 0 | 1 | 2 {
  if (r >= 4) return 2;
  if (r >= 3) return 1;
  return 0;
}

const ROTULOS_9BOX: string[][] = [
  // [potencial baixo→alto][resultado baixo→alto]
  ["Risco", "Eficaz", "Especialista confiável"],
  ["Questionar", "Mantenedor", "Alta performance"],
  ["Enigma", "Crescimento", "Estrela"],
];

export function Performance({ dados }: { dados: Dados }) {
  const { banco, atualizar } = dados;
  const [editando, setEditando] = useState<Avaliacao | null>(null);
  const [ehNovo, setEhNovo] = useState(false);
  const [filtroCiclo, setFiltroCiclo] = useState("");

  const ciclos = useMemo(
    () => [...new Set(banco.avaliacoes.map((a) => a.ciclo))].sort().reverse(),
    [banco.avaliacoes],
  );

  const cicloAtivo = filtroCiclo || ciclos[0] || "";

  /** Última avaliação de cada pessoa dentro do ciclo ativo. */
  const doCiclo = useMemo(() => {
    const porPessoa = new Map<string, Avaliacao>();
    for (const a of banco.avaliacoes.filter((a) => a.ciclo === cicloAtivo)) {
      const atual = porPessoa.get(a.pessoaId);
      if (!atual || a.data > atual.data) porPessoa.set(a.pessoaId, a);
    }
    return [...porPessoa.values()]
      .map((a) => ({
        a,
        pessoa: banco.pessoas.find((p) => p.id === a.pessoaId),
        media: mediaCompetencias(a.competencias),
      }))
      .filter((x) => x.pessoa)
      .sort((x, y) => y.media + y.a.resultado - (x.media + x.a.resultado));
  }, [banco, cicloAtivo]);

  const semAvaliacao = useMemo(
    () =>
      banco.pessoas.filter(
        (p) =>
          p.status !== "Desligado" &&
          !banco.avaliacoes.some((a) => a.pessoaId === p.id && a.ciclo === cicloAtivo),
      ),
    [banco, cicloAtivo],
  );

  const nineBox = useMemo(() => {
    // grade[potencial 1..3][faixaResultado 0..2]
    const grade: { nome: string }[][][] = [0, 1, 2].map(() => [0, 1, 2].map(() => []));
    for (const { a, pessoa } of doCiclo) {
      if (!pessoa) continue;
      const pot = Math.min(3, Math.max(1, a.potencial)) - 1;
      grade[pot][faixaResultado(a.resultado)].push({ nome: pessoa.nome });
    }
    return grade;
  }, [doCiclo]);

  const salvar = () => {
    if (!editando || !editando.pessoaId) return;
    atualizar((b) => ({
      ...b,
      avaliacoes: ehNovo
        ? [...b.avaliacoes, editando]
        : b.avaliacoes.map((a) => (a.id === editando.id ? editando : a)),
    }));
    setEditando(null);
  };

  const excluir = () => {
    if (!editando || !window.confirm("Excluir esta avaliação?")) return;
    atualizar((b) => ({
      ...b,
      avaliacoes: b.avaliacoes.filter((a) => a.id !== editando.id),
    }));
    setEditando(null);
  };

  const editar = (campo: keyof Avaliacao, valor: unknown) =>
    setEditando((a) => (a ? { ...a, [campo]: valor } : a));

  const editarCompetencia = (chave: keyof Competencias, valor: number) =>
    setEditando((a) =>
      a ? { ...a, competencias: { ...a.competencias, [chave]: valor } } : a,
    );

  const pessoasAtivas = banco.pessoas.filter((p) => p.status !== "Desligado");

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Performance</h1>
        <div className="espaco" />
        <button
          className="botao primario"
          onClick={() => {
            setEhNovo(true);
            setEditando(avaliacaoVazia(pessoasAtivas[0]?.id ?? ""));
          }}
          disabled={pessoasAtivas.length === 0}
        >
          + Nova avaliação
        </button>
        <div className="sub">
          Avaliações por ciclo, competências de 1 a 5 e o 9-box para decidir
          promoção, desenvolvimento e sucessão.
        </div>
      </div>

      {ciclos.length > 0 && (
        <div className="filtros">
          <select value={cicloAtivo} onChange={(e) => setFiltroCiclo(e.target.value)}>
            {ciclos.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {semAvaliacao.length > 0 && (
            <span style={{ alignSelf: "center", fontSize: 12.5, color: "var(--ink-mute)" }}>
              sem avaliação neste ciclo: {semAvaliacao.map((p) => p.nome.split(" ")[0]).join(", ")}
            </span>
          )}
        </div>
      )}

      {doCiclo.length === 0 ? (
        <div className="cartao">
          <Vazio>
            Nenhuma avaliação registrada{cicloAtivo ? ` no ciclo ${cicloAtivo}` : ""}.
            <br />
            Registre a primeira em “+ Nova avaliação”.
          </Vazio>
        </div>
      ) : (
        <>
          <div className="cartao rolagem-x" style={{ marginBottom: 14 }}>
            <h2>Avaliações — ciclo {cicloAtivo}</h2>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  {Object.values(COMPETENCIA_LABELS).map((l) => (
                    <th key={l} className="num">{l}</th>
                  ))}
                  <th className="num">Média</th>
                  <th className="num">Resultado</th>
                  <th>Plano de ação</th>
                </tr>
              </thead>
              <tbody>
                {doCiclo.map(({ a, pessoa, media }) => (
                  <tr
                    key={a.id}
                    className="clicavel"
                    onClick={() => {
                      setEhNovo(false);
                      setEditando({ ...a, competencias: { ...a.competencias } });
                    }}
                  >
                    <td>
                      <div className="principal">{pessoa!.nome}</div>
                      <div className="secundario">
                        {pessoa!.cargo} · avaliado em {fmtDataCurta(a.data)}
                      </div>
                    </td>
                    {(Object.keys(COMPETENCIA_LABELS) as (keyof Competencias)[]).map((k) => (
                      <td key={k} className="num">{a.competencias[k]}</td>
                    ))}
                    <td className="num">
                      <Badge tom={tomNota(media)}>{fmtNota(media)}</Badge>
                    </td>
                    <td className="num">
                      <Badge tom={tomNota(a.resultado)}>{a.resultado}</Badge>
                    </td>
                    <td className="secundario" style={{ maxWidth: 220 }}>
                      {a.planoAcao || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="cartao">
            <h2>9-box — resultado × potencial ({cicloAtivo})</h2>
            <div className="ninebox">
              {[2, 1, 0].map((pot) => (
                <FragmentoLinha key={pot} pot={pot} celulas={nineBox[pot]} />
              ))}
              <div />
              <div className="eixo">Resultado baixo</div>
              <div className="eixo">Resultado médio</div>
              <div className="eixo">Resultado alto</div>
            </div>
          </div>
        </>
      )}

      <Modal
        titulo={ehNovo ? "Nova avaliação" : "Editar avaliação"}
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
      >
        {editando && (
          <>
            <div className="form-grade">
              <Campo label="Colaborador">
                <select
                  value={editando.pessoaId}
                  onChange={(e) => editar("pessoaId", e.target.value)}
                >
                  {pessoasAtivas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Ciclo">
                <input
                  value={editando.ciclo}
                  onChange={(e) => editar("ciclo", e.target.value)}
                  placeholder="Ex.: 2026-S2"
                />
              </Campo>
              {(Object.keys(COMPETENCIA_LABELS) as (keyof Competencias)[]).map((k) => (
                <Campo key={k} label={`${COMPETENCIA_LABELS[k]} (1–5)`}>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={editando.competencias[k]}
                    onChange={(e) =>
                      editarCompetencia(k, Math.min(5, Math.max(1, Number(e.target.value) || 1)))
                    }
                  />
                </Campo>
              ))}
              <Campo label="Resultado / metas (1–5)">
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={editando.resultado}
                  onChange={(e) =>
                    editar("resultado", Math.min(5, Math.max(1, Number(e.target.value) || 1)))
                  }
                />
              </Campo>
              <Campo label="Potencial">
                <select
                  value={editando.potencial}
                  onChange={(e) => editar("potencial", Number(e.target.value))}
                >
                  <option value={1}>1 — Baixo</option>
                  <option value={2}>2 — Médio</option>
                  <option value={3}>3 — Alto</option>
                </select>
              </Campo>
              <Campo label="Data da avaliação">
                <input
                  type="date"
                  value={editando.data}
                  onChange={(e) => editar("data", e.target.value)}
                />
              </Campo>
              <Campo label="Pontos fortes" largo>
                <textarea
                  rows={2}
                  value={editando.pontosFortes}
                  onChange={(e) => editar("pontosFortes", e.target.value)}
                />
              </Campo>
              <Campo label="Pontos a desenvolver" largo>
                <textarea
                  rows={2}
                  value={editando.pontosDesenvolver}
                  onChange={(e) => editar("pontosDesenvolver", e.target.value)}
                />
              </Campo>
              <Campo label="Plano de ação" largo>
                <textarea
                  rows={2}
                  value={editando.planoAcao}
                  onChange={(e) => editar("planoAcao", e.target.value)}
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
              <button className="botao primario" onClick={salvar} disabled={!editando.pessoaId}>
                Salvar
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

function FragmentoLinha({
  pot,
  celulas,
}: {
  pot: number;
  celulas: { nome: string }[][];
}) {
  const rotuloEixo = ["Potencial baixo", "Potencial médio", "Potencial alto"][pot];
  return (
    <>
      <div className="eixo vert">{rotuloEixo}</div>
      {[0, 1, 2].map((res) => {
        const destaque = pot === 2 && res === 2;
        return (
          <div key={res} className={`celula${destaque ? " destaque" : ""}`}>
            <div className="titulo-celula">{ROTULOS_9BOX[pot][res]}</div>
            {celulas[res].map((p, i) => (
              <span key={i} className="pessoa-chip">
                {p.nome.split(" ").slice(0, 2).join(" ")}
              </span>
            ))}
          </div>
        );
      })}
    </>
  );
}
