import { useMemo, useState } from "react";
import type { Dados } from "../App";
import type { Ferias, RiscoFerias, StatusFerias } from "../types";
import { Badge, Campo, Modal, Vazio, type TomBadge } from "../components/ui";
import { fimDoPeriodo, fmtData, fmtDataCurta, hojeISO, sobrepoe } from "../lib/datas";
import { MAX_DIAS_VENDIDOS, ORDEM_RISCO, situacaoFerias, validarFracionamento } from "../lib/ferias";
import { fmtDias, novoId } from "../lib/formato";

const TOM_RISCO: Record<RiscoFerias, TomBadge> = {
  Vencido: "critico",
  Crítico: "critico",
  Atenção: "atencao",
  "Em dia": "bom",
  "Em aquisição": "neutro",
};

const STATUS_FERIAS: StatusFerias[] = ["Planejada", "Aprovada", "Gozada"];

function feriasVazia(pessoaId: string): Ferias {
  return {
    id: novoId("f"),
    pessoaId,
    inicio: hojeISO(),
    dias: 30,
    status: "Planejada",
    diasVendidos: 0,
    observacao: "",
  };
}

export function FeriasView({ dados }: { dados: Dados }) {
  const { banco, atualizar } = dados;
  const [editando, setEditando] = useState<Ferias | null>(null);
  const [ehNovo, setEhNovo] = useState(false);

  const hoje = hojeISO();

  const situacoes = useMemo(() => {
    return banco.pessoas
      .filter((p) => p.status !== "Desligado" && p.regime === "CLT")
      .map((p) => ({
        pessoa: p,
        sit: situacaoFerias(p, banco.ferias.filter((f) => f.pessoaId === p.id), hoje),
      }))
      .sort(
        (a, b) =>
          ORDEM_RISCO[a.sit.risco] - ORDEM_RISCO[b.sit.risco] ||
          a.sit.diasAteLimite - b.sit.diasAteLimite,
      );
  }, [banco, hoje]);

  const agendamentos = useMemo(
    () =>
      [...banco.ferias]
        .sort((a, b) => b.inicio.localeCompare(a.inicio))
        .map((f) => ({
          f,
          pessoa: banco.pessoas.find((p) => p.id === f.pessoaId),
        })),
    [banco],
  );

  /** Avisos sobre o registro em edição: fracionamento, sobreposição, abono. */
  const avisos = useMemo(() => {
    if (!editando) return [];
    const lista: string[] = [];
    const outras = banco.ferias.filter(
      (f) => f.pessoaId === editando.pessoaId && f.id !== editando.id,
    );

    lista.push(...validarFracionamento([...outras.map((f) => f.dias), editando.dias]));

    const fimNova = fimDoPeriodo(editando.inicio, editando.dias);
    for (const o of outras) {
      if (sobrepoe(editando.inicio, fimNova, o.inicio, fimDoPeriodo(o.inicio, o.dias))) {
        lista.push(`Sobrepõe o período já registrado de ${fmtData(o.inicio)} (${o.dias} dias).`);
      }
    }

    const vendidos = outras.reduce((s, f) => s + f.diasVendidos, 0) + editando.diasVendidos;
    if (vendidos > MAX_DIAS_VENDIDOS) {
      lista.push(`Abono acima do limite: ${vendidos} dias vendidos (máximo legal: ${MAX_DIAS_VENDIDOS}).`);
    }
    return lista;
  }, [editando, banco.ferias]);

  const salvar = () => {
    if (!editando || !editando.pessoaId) return;
    atualizar((b) => ({
      ...b,
      ferias: ehNovo
        ? [...b.ferias, editando]
        : b.ferias.map((f) => (f.id === editando.id ? editando : f)),
    }));
    setEditando(null);
  };

  const excluir = () => {
    if (!editando || !window.confirm("Excluir este registro de férias?")) return;
    atualizar((b) => ({ ...b, ferias: b.ferias.filter((f) => f.id !== editando.id) }));
    setEditando(null);
  };

  const editar = (campo: keyof Ferias, valor: unknown) =>
    setEditando((f) => (f ? { ...f, [campo]: valor } : f));

  const pessoasElegiveis = banco.pessoas.filter((p) => p.status !== "Desligado");

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Férias</h1>
        <div className="espaco" />
        <button
          className="botao primario"
          onClick={() => {
            setEhNovo(true);
            setEditando(feriasVazia(pessoasElegiveis[0]?.id ?? ""));
          }}
          disabled={pessoasElegiveis.length === 0}
        >
          + Agendar férias
        </button>
        <div className="sub">
          Situação legal por colaborador CLT e a agenda de períodos. O painel avisa
          antes do prazo do art. 137 virar pagamento em dobro.
        </div>
      </div>

      <div className="cartao rolagem-x" style={{ marginBottom: 14 }}>
        <h2>Situação por colaborador (CLT)</h2>
        {situacoes.length === 0 ? (
          <Vazio>Nenhum colaborador CLT ativo cadastrado.</Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Período aquisitivo</th>
                <th className="num">Saldo</th>
                <th className="num">Agendado</th>
                <th className="num">Gozado</th>
                <th>Limite legal</th>
                <th>Risco</th>
              </tr>
            </thead>
            <tbody>
              {situacoes.map(({ pessoa, sit }) => (
                <tr key={pessoa.id}>
                  <td>
                    <div className="principal">{pessoa.nome}</div>
                    <div className="secundario">{pessoa.area}</div>
                  </td>
                  <td>
                    {sit.emAquisicao ? (
                      <span className="secundario">
                        acumulando — {sit.diasDireito} dias proporcionais
                      </span>
                    ) : (
                      <>
                        {fmtDataCurta(sit.aquisitivoInicio)} → {fmtDataCurta(sit.aquisitivoFim)}
                      </>
                    )}
                  </td>
                  <td className="num">{sit.emAquisicao ? "—" : `${sit.saldo} d`}</td>
                  <td className="num">{sit.diasAgendados ? `${sit.diasAgendados} d` : "—"}</td>
                  <td className="num">{sit.diasGozados ? `${sit.diasGozados} d` : "—"}</td>
                  <td>
                    {sit.emAquisicao ? (
                      <span className="secundario">direito em {fmtDataCurta(sit.aquisitivoFim)}</span>
                    ) : (
                      <>
                        {fmtDataCurta(sit.limiteGozo)}
                        <div className="secundario">
                          {sit.diasAteLimite >= 0
                            ? `em ${fmtDias(sit.diasAteLimite)}`
                            : `vencido há ${fmtDias(Math.abs(sit.diasAteLimite))}`}
                        </div>
                      </>
                    )}
                  </td>
                  <td>
                    <Badge tom={TOM_RISCO[sit.risco]}>{sit.risco}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="aviso-legal">
          Regra aplicada: 30 dias por período aquisitivo de 12 meses; a empresa tem
          12 meses após o fim do período para conceder (depois, paga em dobro —
          art. 137 CLT). Fracionamento em até 3 períodos, um com ≥ 14 dias e os
          demais com ≥ 5. Faltas injustificadas (art. 130) não estão modeladas —
          confirme o saldo exato com o RH antes de formalizar.
        </div>
      </div>

      <div className="cartao rolagem-x">
        <h2>Agenda de períodos</h2>
        {agendamentos.length === 0 ? (
          <Vazio>Nenhum período registrado. Use “Agendar férias”.</Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Período</th>
                <th className="num">Dias</th>
                <th className="num">Vendidos</th>
                <th>Status</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {agendamentos.map(({ f, pessoa }) => (
                <tr
                  key={f.id}
                  className="clicavel"
                  onClick={() => {
                    setEhNovo(false);
                    setEditando({ ...f });
                  }}
                >
                  <td className="principal">{pessoa?.nome ?? "—"}</td>
                  <td>
                    {fmtDataCurta(f.inicio)} → {fmtDataCurta(fimDoPeriodo(f.inicio, f.dias))}
                  </td>
                  <td className="num">{f.dias}</td>
                  <td className="num">{f.diasVendidos || "—"}</td>
                  <td>
                    <Badge tom={f.status === "Gozada" ? "neutro" : f.status === "Aprovada" ? "bom" : "atencao"}>
                      {f.status}
                    </Badge>
                  </td>
                  <td className="secundario">{f.observacao || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        titulo={ehNovo ? "Agendar férias" : "Editar período de férias"}
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
      >
        {editando && (
          <>
            <div className="form-grade">
              <Campo label="Colaborador" largo>
                <select
                  value={editando.pessoaId}
                  onChange={(e) => editar("pessoaId", e.target.value)}
                >
                  {pessoasElegiveis.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.regime !== "CLT" ? `(${p.regime})` : ""}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Início">
                <input
                  type="date"
                  value={editando.inicio}
                  onChange={(e) => editar("inicio", e.target.value)}
                />
              </Campo>
              <Campo label="Dias corridos">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={editando.dias || ""}
                  onChange={(e) => editar("dias", Number(e.target.value))}
                />
              </Campo>
              <Campo label="Dias vendidos (abono)">
                <input
                  type="number"
                  min={0}
                  max={MAX_DIAS_VENDIDOS}
                  value={editando.diasVendidos || ""}
                  placeholder="0"
                  onChange={(e) => editar("diasVendidos", Number(e.target.value) || 0)}
                />
              </Campo>
              <Campo label="Status">
                <select
                  value={editando.status}
                  onChange={(e) => editar("status", e.target.value as StatusFerias)}
                >
                  {STATUS_FERIAS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Observação" largo>
                <input
                  value={editando.observacao}
                  onChange={(e) => editar("observacao", e.target.value)}
                />
              </Campo>
            </div>

            {avisos.length > 0 && (
              <div className="aviso-legal">
                {avisos.map((a, i) => (
                  <div key={i}>⚠ {a}</div>
                ))}
              </div>
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
                disabled={!editando.pessoaId || editando.dias < 1}
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
