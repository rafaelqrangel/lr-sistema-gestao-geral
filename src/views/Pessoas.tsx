/**
 * Quadro de pessoal — quem ocupa cada cargo.
 *
 * A pessoa não carrega descrição de função: isso mora no cargo. Aqui ficam
 * vínculo, salário (e sua posição na faixa), gestor, substituto formal e
 * eixo de carreira.
 */

import { useMemo, useState } from "react";
import type { EixoTrilha, Pessoa, Regime, StatusPessoa } from "../types";
import { chaveCargo, posicaoNaFaixa } from "../types";
import type { Dados } from "../App";
import { Badge, Campo, ListaTexto, Modal, Vazio, type TomBadge } from "../components/ui";
import { hojeISO, mesesEntre } from "../lib/datas";
import { situacaoFerias } from "../lib/ferias";
import { fmtBRL, fmtNum, novoId } from "../lib/formato";

const REGIMES: Regime[] = ["CLT", "PJ", "PJ / Representação", "Estágio", "Aprendiz", "Terceiro"];
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
    cargoId: null,
    area: "",
    regime: "CLT",
    dataAdmissao: hojeISO(),
    salario: 0,
    modeloVariavel: "",
    gestorId: null,
    substitutoId: null,
    trilhaEixo: null,
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
  const [mostrarSalarios, setMostrarSalarios] = useState(false);

  const hoje = hojeISO();
  const cargoDe = (id: string | null) => banco.cargos.find((c) => c.id === id);
  const nomeDe = (id: string | null) => banco.pessoas.find((p) => p.id === id)?.nome ?? "—";

  const areas = useMemo(
    () => [...new Set(banco.pessoas.map((p) => p.area).filter(Boolean))].sort(),
    [banco.pessoas],
  );

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return banco.pessoas
      .filter((p) => (mostrarDesligados ? true : p.status !== "Desligado"))
      .filter((p) => (filtroArea ? p.area === filtroArea : true))
      .filter((p) => {
        if (!termo) return true;
        const cargo = cargoDe(p.cargoId);
        return (
          p.nome.toLowerCase().includes(termo) ||
          p.area.toLowerCase().includes(termo) ||
          (cargo ? chaveCargo(cargo).toLowerCase().includes(termo) : false)
        );
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [banco.pessoas, banco.cargos, filtroArea, busca, mostrarDesligados]);

  const ativos = banco.pessoas.filter((p) => p.status !== "Desligado");
  const folha = ativos.reduce((s, p) => s + p.salario, 0);
  const semCargo = ativos.filter((p) => !p.cargoId).length;
  const semAdmissao = ativos.filter((p) => !p.dataAdmissao).length;

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
    if (!editando || !window.confirm(`Excluir ${editando.nome}? As férias e avaliações dela também serão removidas.`)) {
      return;
    }
    atualizar((b) => ({
      ...b,
      pessoas: b.pessoas.filter((p) => p.id !== editando.id),
      ferias: b.ferias.filter((f) => f.pessoaId !== editando.id),
      avaliacoes: b.avaliacoes.filter((a) => a.pessoaId !== editando.id),
      // Referências cruzadas ficam órfãs se não forem limpas junto.
      processos: b.processos.map((pr) => ({
        ...pr,
        donoId: pr.donoId === editando.id ? null : pr.donoId,
        backupId: pr.backupId === editando.id ? null : pr.backupId,
        participantesIds: pr.participantesIds.filter((i) => i !== editando.id),
      })),
    }));
    setEditando(null);
  };

  const editar = (campo: keyof Pessoa, valor: unknown) =>
    setEditando((p) => (p ? { ...p, [campo]: valor } : p));

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Quadro de pessoal</h1>
        <div className="espaco" />
        <button
          className="botao primario"
          onClick={() => {
            setEhNovo(true);
            setEditando(pessoaVazia());
          }}
        >
          + Adicionar pessoa
        </button>
        <div className="sub">
          {ativos.length} pessoa(s) ativa(s)
          {mostrarSalarios ? ` · folha mensal ${fmtBRL(folha)}` : ""}
          {semCargo > 0 ? ` · ${semCargo} sem cargo definido` : ""}
          {semAdmissao > 0 ? ` · ${semAdmissao} sem data de admissão` : ""}
        </div>
      </div>

      <div className="filtros">
        <input
          placeholder="Buscar por nome, cargo ou área…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}>
          <option value="">Todas as áreas</option>
          {areas.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <button
          className={`botao mini${mostrarDesligados ? " primario" : ""}`}
          onClick={() => setMostrarDesligados((v) => !v)}
        >
          Incluir desligados
        </button>
        <button
          className={`botao mini${mostrarSalarios ? " primario" : ""}`}
          onClick={() => setMostrarSalarios((v) => !v)}
        >
          {mostrarSalarios ? "Ocultar salários" : "Mostrar salários"}
        </button>
      </div>

      <div className="cartao rolagem-x">
        {lista.length === 0 ? (
          <Vazio>Nenhuma pessoa encontrada.</Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Cargo</th>
                <th>Área</th>
                <th>Vínculo</th>
                <th className="num">Casa</th>
                {mostrarSalarios && <th className="num">Salário</th>}
                {mostrarSalarios && <th className="num">Posição na faixa</th>}
                <th>Gestor</th>
                <th>Substituto</th>
                <th>Férias</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const cargo = cargoDe(p.cargoId);
                const faixa = banco.faixas.find((f) => f.cargoId === p.cargoId);
                const posicao =
                  faixa && p.salario > 0 ? posicaoNaFaixa(p.salario, faixa) : null;
                const meses = p.dataAdmissao ? mesesEntre(p.dataAdmissao, hoje) : null;
                const sit =
                  p.regime === "CLT" && p.dataAdmissao
                    ? situacaoFerias(p, banco.ferias.filter((f) => f.pessoaId === p.id), hoje)
                    : null;
                return (
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
                      <div className="secundario">{p.email || "sem e-mail"}</div>
                    </td>
                    <td>
                      {cargo ? (
                        <>
                          <div>{cargo.nome}</div>
                          <div className="secundario">{cargo.nivel}</div>
                        </>
                      ) : (
                        <Badge tom="atencao">Sem cargo</Badge>
                      )}
                    </td>
                    <td>{p.area}</td>
                    <td>{p.regime}</td>
                    <td className="num">
                      {meses === null ? "—" : `${Math.floor(meses / 12)}a ${meses % 12}m`}
                    </td>
                    {mostrarSalarios && (
                      <td className="num">{p.salario ? fmtBRL(p.salario) : "—"}</td>
                    )}
                    {mostrarSalarios && (
                      <td className="num">
                        {posicao === null ? (
                          "—"
                        ) : (
                          <Badge
                            tom={posicao < 0 || posicao > 100 ? "critico" : "neutro"}
                          >
                            {fmtNum(posicao)}%
                          </Badge>
                        )}
                      </td>
                    )}
                    <td>{nomeDe(p.gestorId)}</td>
                    <td>
                      {p.substitutoId ? (
                        nomeDe(p.substitutoId)
                      ) : (
                        <span className="secundario">—</span>
                      )}
                    </td>
                    <td>
                      {sit ? (
                        <Badge
                          tom={
                            sit.risco === "Vencido" || sit.risco === "Crítico"
                              ? "critico"
                              : sit.risco === "Atenção"
                                ? "atencao"
                                : "neutro"
                          }
                        >
                          {sit.risco}
                        </Badge>
                      ) : (
                        <span className="secundario">—</span>
                      )}
                    </td>
                    <td>
                      <Badge tom={TOM_STATUS[p.status]}>{p.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        titulo={ehNovo ? "Adicionar pessoa" : "Editar pessoa"}
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
      >
        {editando && (
          <>
            <div className="form-grade">
              <Campo label="Nome" largo>
                <input
                  value={editando.nome}
                  onChange={(e) => editar("nome", e.target.value)}
                  autoFocus={ehNovo}
                />
              </Campo>
              <Campo label="E-mail corporativo" largo>
                <input
                  value={editando.email}
                  onChange={(e) => editar("email", e.target.value)}
                  placeholder="nome.sobrenome@lr.com.br"
                />
              </Campo>
              <Campo label="Cargo">
                <select
                  value={editando.cargoId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value || null;
                    const cargo = banco.cargos.find((c) => c.id === id);
                    setEditando((p) =>
                      p
                        ? {
                            ...p,
                            cargoId: id,
                            // Herda área e vínculo do cargo quando ainda em branco.
                            area: p.area || (cargo?.area ?? ""),
                            regime: cargo?.vinculo ?? p.regime,
                          }
                        : p,
                    );
                  }}
                >
                  <option value="">— sem cargo</option>
                  {banco.cargos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {chaveCargo(c)}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Área / regional">
                <input
                  value={editando.area}
                  onChange={(e) => editar("area", e.target.value)}
                  placeholder="Comercial - Regional NORDESTE"
                />
              </Campo>
              <Campo label="Vínculo">
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
              <Campo label="Salário fixo (R$)">
                <input
                  type="number"
                  min={0}
                  step="100"
                  value={editando.salario || ""}
                  onChange={(e) => editar("salario", Number(e.target.value))}
                />
              </Campo>
              <Campo label="Modelo de variável">
                <input
                  value={editando.modeloVariavel}
                  onChange={(e) => editar("modeloVariavel", e.target.value)}
                  placeholder="Ex.: até 3 salários/ano por atingimento"
                />
              </Campo>
              <Campo label="Gestor direto">
                <select
                  value={editando.gestorId ?? ""}
                  onChange={(e) => editar("gestorId", e.target.value || null)}
                >
                  <option value="">— (reporta a você)</option>
                  {banco.pessoas
                    .filter((p) => p.id !== editando.id && p.status !== "Desligado")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                </select>
              </Campo>
              <Campo label="Substituto formal">
                <select
                  value={editando.substitutoId ?? ""}
                  onChange={(e) => editar("substitutoId", e.target.value || null)}
                >
                  <option value="">— não definido</option>
                  {banco.pessoas
                    .filter((p) => p.id !== editando.id && p.status !== "Desligado")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                </select>
              </Campo>
              <Campo label="Eixo de carreira">
                <select
                  value={editando.trilhaEixo ?? ""}
                  onChange={(e) =>
                    editar("trilhaEixo", (e.target.value || null) as EixoTrilha | null)
                  }
                >
                  <option value="">— não posicionado</option>
                  <option value="Técnico">Técnico</option>
                  <option value="Gestão">Gestão</option>
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
              <Campo label="Atribuições específicas desta pessoa (uma por linha)" largo>
                <ListaTexto
                  valor={editando.atribuicoes}
                  aoMudar={(v) => editar("atribuicoes", v)}
                  dica="Além das atribuições do cargo — ex.: Conta Grupo Mateus"
                />
              </Campo>
              <Campo label="Observações" largo>
                <input
                  value={editando.observacoes}
                  onChange={(e) => editar("observacoes", e.target.value)}
                />
              </Campo>
            </div>

            {editando.cargoId && (
              <p className="sub">
                Propósito, atribuições núcleo e alçada vêm do cargo — edite em{" "}
                <strong>Arquitetura de cargos</strong> para valer a todos os
                ocupantes.
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
