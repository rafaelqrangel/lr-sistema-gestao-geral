/**
 * Calendário — a agenda do gestor num lugar só.
 *
 * Junta o que já está cadastrado (ocorrências de processos, prazos finais,
 * férias da equipe, viagens aprovadas) com os eventos avulsos criados aqui.
 */

import { useMemo, useState } from "react";
import type { Dados } from "../App";
import type { Evento, ItemAgenda, TipoEvento } from "../types";
import { TIPOS_EVENTO } from "../types";
import { Badge, Campo, Modal, Vazio } from "../components/ui";
import { gradeDoMes, itensDaAgenda, itensDoDia, limitesDoMes } from "../lib/agenda";
import { fmtData, fmtDataCurta, hojeISO, MESES_LONGOS, paraData, paraISO } from "../lib/datas";
import { novoId } from "../lib/formato";

const DIAS_SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

const ROTULO_TOM: Record<ItemAgenda["tom"], string> = {
  processo: "Rotina",
  prazo: "Prazo final",
  ferias: "Férias",
  viagem: "Viagem",
  evento: "Evento",
};

function eventoVazio(dia: string): Evento {
  return {
    id: novoId("ev"),
    titulo: "",
    tipo: "Reunião",
    inicio: dia,
    fim: dia,
    local: "",
    pessoasIds: [],
    observacao: "",
  };
}

export function Calendario({ dados }: { dados: Dados }) {
  const { banco, atualizar } = dados;
  const hoje = hojeISO();
  const [cursor, setCursor] = useState(() => {
    const d = paraData(hoje);
    return { ano: d.getFullYear(), mes: d.getMonth() };
  });
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const [editando, setEditando] = useState<Evento | null>(null);
  const [ehNovo, setEhNovo] = useState(false);
  const [filtros, setFiltros] = useState<Record<ItemAgenda["tom"], boolean>>({
    processo: true,
    prazo: true,
    ferias: true,
    viagem: true,
    evento: true,
  });

  const semanas = useMemo(() => gradeDoMes(cursor.ano, cursor.mes), [cursor]);

  const itens = useMemo(() => {
    // A grade mostra bordas do mês anterior/seguinte: consulta a janela toda.
    const primeiro = semanas[0][0];
    const ultimo = semanas[semanas.length - 1][6];
    return itensDaAgenda(banco, primeiro, ultimo).filter((i) => filtros[i.tom]);
  }, [banco, semanas, filtros]);

  const { inicio: inicioMes, fim: fimMes } = limitesDoMes(cursor.ano, cursor.mes);
  const doMes = itens.filter((i) => i.inicio <= fimMes && i.fim >= inicioMes);

  const andar = (passo: number) => {
    const d = new Date(cursor.ano, cursor.mes + passo, 1);
    setCursor({ ano: d.getFullYear(), mes: d.getMonth() });
  };

  const salvar = () => {
    if (!editando || !editando.titulo.trim()) return;
    const pronto = {
      ...editando,
      fim: editando.fim < editando.inicio ? editando.inicio : editando.fim,
    };
    atualizar((b) => ({
      ...b,
      eventos: ehNovo
        ? [...b.eventos, pronto]
        : b.eventos.map((e) => (e.id === pronto.id ? pronto : e)),
    }));
    setEditando(null);
  };

  const excluir = () => {
    if (!editando || !window.confirm("Excluir este evento?")) return;
    atualizar((b) => ({ ...b, eventos: b.eventos.filter((e) => e.id !== editando.id) }));
    setEditando(null);
  };

  const editar = (campo: keyof Evento, valor: unknown) =>
    setEditando((e) => (e ? { ...e, [campo]: valor } : e));

  const equipe = banco.pessoas.filter((p) => p.status !== "Desligado");

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Calendário</h1>
        <div className="espaco" />
        <button className="botao" onClick={() => andar(-1)}>
          ‹ Anterior
        </button>
        <button
          className="botao"
          onClick={() => {
            const d = paraData(hoje);
            setCursor({ ano: d.getFullYear(), mes: d.getMonth() });
          }}
        >
          Hoje
        </button>
        <button className="botao" onClick={() => andar(1)}>
          Próximo ›
        </button>
        <button
          className="botao primario"
          onClick={() => {
            setEhNovo(true);
            setEditando(eventoVazio(hoje));
          }}
        >
          + Novo evento
        </button>
        <div className="sub">
          {MESES_LONGOS[cursor.mes]} de {cursor.ano} · {doMes.length} item(ns) na agenda
        </div>
      </div>

      <div className="filtros">
        {(Object.keys(ROTULO_TOM) as ItemAgenda["tom"][]).map((tom) => (
          <button
            key={tom}
            className={`botao mini${filtros[tom] ? " primario" : ""}`}
            onClick={() => setFiltros((f) => ({ ...f, [tom]: !f[tom] }))}
          >
            <span className={`ponto ${tom}`} /> {ROTULO_TOM[tom]}
          </button>
        ))}
      </div>

      <div className="cartao">
        <div className="calendario">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="cal-cabecalho">
              {d}
            </div>
          ))}
          {semanas.flat().map((dia) => {
            const doDia = itensDoDia(itens, dia);
            const noMes = paraData(dia).getMonth() === cursor.mes;
            return (
              <button
                key={dia}
                className={`cal-dia${noMes ? "" : " fora"}${dia === hoje ? " hoje" : ""}`}
                onClick={() => setDiaAberto(dia)}
              >
                <span className="cal-numero">{paraData(dia).getDate()}</span>
                {doDia.slice(0, 3).map((i) => (
                  <span key={i.id} className={`cal-item ${i.tom}`} title={i.titulo}>
                    {i.horario ? `${i.horario} ` : ""}
                    {i.titulo}
                  </span>
                ))}
                {doDia.length > 3 && (
                  <span className="cal-mais">+{doDia.length - 3}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="cartao" style={{ marginTop: 12 }}>
        <h2 style={{ marginTop: 0, fontSize: 15 }}>Próximos 30 dias</h2>
        <ProximosItens banco={banco} filtros={filtros} />
      </div>

      <Modal
        titulo={diaAberto ? fmtData(diaAberto) : ""}
        aberto={diaAberto !== null && editando === null}
        aoFechar={() => setDiaAberto(null)}
      >
        {diaAberto && (
          <>
            {itensDoDia(itens, diaAberto).length === 0 ? (
              <Vazio>Nada agendado neste dia.</Vazio>
            ) : (
              <ul className="lista-agenda">
                {itensDoDia(itens, diaAberto).map((i) => (
                  <li key={i.id}>
                    <span className={`ponto ${i.tom}`} />
                    <div>
                      <div className="principal">
                        {i.horario ? `${i.horario} · ` : ""}
                        {i.titulo}
                      </div>
                      <div className="secundario">
                        {i.detalhe}
                        {i.inicio !== i.fim
                          ? ` · ${fmtDataCurta(i.inicio)} a ${fmtDataCurta(i.fim)}`
                          : ""}
                      </div>
                    </div>
                    <div className="espaco" />
                    <Badge tom="neutro">{ROTULO_TOM[i.tom]}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <div className="modal-acoes">
              <button
                className="botao"
                onClick={() => {
                  setEhNovo(true);
                  setEditando(eventoVazio(diaAberto));
                }}
              >
                + Evento neste dia
              </button>
              <button className="botao primario" onClick={() => setDiaAberto(null)}>
                Fechar
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        titulo={ehNovo ? "Novo evento" : "Editar evento"}
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
      >
        {editando && (
          <>
            <div className="form-grade">
              <Campo label="Título" largo>
                <input
                  value={editando.titulo}
                  onChange={(e) => editar("titulo", e.target.value)}
                  autoFocus={ehNovo}
                  placeholder="Ex.: Visita a clientes — Recife"
                />
              </Campo>
              <Campo label="Tipo">
                <select
                  value={editando.tipo}
                  onChange={(e) => editar("tipo", e.target.value as TipoEvento)}
                >
                  {TIPOS_EVENTO.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Local">
                <input
                  value={editando.local}
                  onChange={(e) => editar("local", e.target.value)}
                />
              </Campo>
              <Campo label="Início">
                <input
                  type="date"
                  value={editando.inicio}
                  onChange={(e) => editar("inicio", e.target.value)}
                />
              </Campo>
              <Campo label="Fim">
                <input
                  type="date"
                  value={editando.fim}
                  min={editando.inicio}
                  onChange={(e) => editar("fim", e.target.value)}
                />
              </Campo>
              <Campo label="Quem participa" largo>
                <div className="caixa-checks">
                  {equipe.map((p) => (
                    <label key={p.id}>
                      <input
                        type="checkbox"
                        checked={editando.pessoasIds.includes(p.id)}
                        onChange={(e) =>
                          editar(
                            "pessoasIds",
                            e.target.checked
                              ? [...editando.pessoasIds, p.id]
                              : editando.pessoasIds.filter((i) => i !== p.id),
                          )
                        }
                      />
                      {p.nome}
                    </label>
                  ))}
                </div>
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
                disabled={!editando.titulo.trim()}
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

function ProximosItens({
  banco,
  filtros,
}: {
  banco: Dados["banco"];
  filtros: Record<ItemAgenda["tom"], boolean>;
}) {
  const hoje = hojeISO();
  const fim = paraISO(new Date(paraData(hoje).getTime() + 30 * 86_400_000));
  const itens = itensDaAgenda(banco, hoje, fim)
    .filter((i) => filtros[i.tom])
    .slice(0, 20);

  if (itens.length === 0) return <Vazio>Nada nos próximos 30 dias.</Vazio>;

  return (
    <ul className="lista-agenda">
      {itens.map((i) => (
        <li key={i.id}>
          <span className={`ponto ${i.tom}`} />
          <div>
            <div className="principal">
              {fmtDataCurta(i.inicio)}
              {i.horario ? ` · ${i.horario}` : ""} — {i.titulo}
            </div>
            <div className="secundario">{i.detalhe}</div>
          </div>
          <div className="espaco" />
          <Badge tom="neutro">{ROTULO_TOM[i.tom]}</Badge>
        </li>
      ))}
    </ul>
  );
}
