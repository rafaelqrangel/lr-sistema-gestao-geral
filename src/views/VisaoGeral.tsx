import { useMemo } from "react";
import type { Dados } from "../App";
import { Badge, Barras } from "../components/ui";
import { diasEntre, fmtPrazo, hojeISO } from "../lib/datas";
import { ORDEM_RISCO, situacaoFerias } from "../lib/ferias";
import { fmtBRL, fmtDias, fmtNum } from "../lib/formato";

interface Alerta {
  gravidade: "critico" | "serio" | "atencao";
  quem: string;
  texto: string;
}

export function VisaoGeral({ dados }: { dados: Dados }) {
  const { banco } = dados;
  const hoje = hojeISO();

  const resumo = useMemo(() => {
    const ativos = banco.pessoas.filter((p) => p.status !== "Desligado");
    const folha = ativos.reduce((s, p) => s + p.salario, 0);

    const pendentes = banco.aprovacoes.filter(
      (a) => a.status === "Pendente" || a.status === "Em análise",
    );
    const valorPendente = pendentes.reduce((s, a) => s + a.valor, 0);

    const situacoes = ativos
      .filter((p) => p.regime === "CLT")
      .map((p) =>
        situacaoFerias(p, banco.ferias.filter((f) => f.pessoaId === p.id), hoje),
      );
    const feriasRisco = situacoes.filter(
      (s) => s.risco === "Vencido" || s.risco === "Crítico",
    ).length;

    const processosProblema = banco.processos.filter(
      (p) => p.status === "Atrasado" || p.status === "Parado",
    ).length;

    // Alertas ordenados por gravidade.
    const alertas: Alerta[] = [];
    const nomeDe = (id: string | null) =>
      banco.pessoas.find((p) => p.id === id)?.nome ?? "—";

    for (const s of [...situacoes].sort((a, b) => ORDEM_RISCO[a.risco] - ORDEM_RISCO[b.risco])) {
      const nome = nomeDe(s.pessoaId);
      if (s.risco === "Vencido") {
        alertas.push({
          gravidade: "critico",
          quem: nome,
          texto: `férias com prazo legal VENCIDO há ${fmtDias(Math.abs(s.diasAteLimite))} — pagamento em dobro (saldo: ${fmtDias(s.saldo)})`,
        });
      } else if (s.risco === "Crítico") {
        alertas.push({
          gravidade: "critico",
          quem: nome,
          texto: `férias vencem em ${fmtDias(s.diasAteLimite)} e ainda há ${fmtDias(s.saldo)} de saldo — agendar já`,
        });
      } else if (s.risco === "Atenção") {
        alertas.push({
          gravidade: "atencao",
          quem: nome,
          texto: `férias vencem em ${fmtDias(s.diasAteLimite)} (saldo: ${fmtDias(s.saldo)})`,
        });
      }
    }

    for (const a of pendentes) {
      const atraso = diasEntre(a.prazoResposta, hoje);
      if (atraso > 0) {
        alertas.push({
          gravidade: "serio",
          quem: a.tipo,
          texto: `"${a.descricao}" de ${nomeDe(a.solicitanteId)} aguarda decisão há ${fmtDias(atraso)} além do prazo (${fmtBRL(a.valor)})`,
        });
      }
    }

    for (const p of banco.processos) {
      if (p.status === "Parado") {
        alertas.push({
          gravidade: "critico",
          quem: p.nome,
          texto: `processo PARADO — dono: ${nomeDe(p.donoId)}`,
        });
      } else if (p.status === "Atrasado") {
        alertas.push({
          gravidade: "serio",
          quem: p.nome,
          texto: `processo atrasado — dono: ${nomeDe(p.donoId)}, prazo: ${p.prazo || "não definido"}`,
        });
      }
      if (p.criticidade === "Crítica" && !p.backupId) {
        alertas.push({
          gravidade: "atencao",
          quem: p.nome,
          texto: `processo crítico sem backup definido — risco de continuidade se ${nomeDe(p.donoId)} faltar`,
        });
      }
    }

    const peso = { critico: 0, serio: 1, atencao: 2 } as const;
    alertas.sort((a, b) => peso[a.gravidade] - peso[b.gravidade]);

    // Distribuições por área.
    const porArea = new Map<string, { pessoas: number; folha: number }>();
    for (const p of ativos) {
      const area = p.area || "Sem área";
      const atual = porArea.get(area) ?? { pessoas: 0, folha: 0 };
      atual.pessoas += 1;
      atual.folha += p.salario;
      porArea.set(area, atual);
    }
    const areas = [...porArea.entries()].sort((a, b) => b[1].folha - a[1].folha);

    // Fila de aprovações mais urgente primeiro.
    const fila = [...pendentes].sort((a, b) => a.prazoResposta.localeCompare(b.prazoResposta));

    return {
      ativos: ativos.length,
      emFerias: ativos.filter((p) => p.status === "Férias").length,
      folha,
      pendentes: pendentes.length,
      valorPendente,
      feriasRisco,
      processosProblema,
      alertas,
      areas,
      fila: fila.slice(0, 5),
      nomeDe,
    };
  }, [banco, hoje]);

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Visão geral</h1>
        <div className="sub">O que precisa da sua atenção hoje, num lugar só.</div>
      </div>

      <div className="grade kpis" style={{ marginBottom: 14 }}>
        <div className="cartao kpi">
          <div className="rotulo">Equipe ativa</div>
          <div className="valor">{resumo.ativos}</div>
          <div className="apoio">{resumo.emFerias} em férias agora</div>
        </div>
        <div className="cartao kpi">
          <div className="rotulo">Folha mensal</div>
          <div className="valor">{fmtBRL(resumo.folha)}</div>
          <div className="apoio">salários brutos somados</div>
        </div>
        <div className={`cartao kpi${resumo.pendentes > 0 ? " alerta" : ""}`}>
          <div className="rotulo">Aprovações na fila</div>
          <div className="valor">{resumo.pendentes}</div>
          <div className="apoio">{fmtBRL(resumo.valorPendente)} aguardando decisão</div>
        </div>
        <div className={`cartao kpi${resumo.feriasRisco > 0 ? " alerta" : ""}`}>
          <div className="rotulo">Férias em risco</div>
          <div className="valor">{resumo.feriasRisco}</div>
          <div className="apoio">vencidas ou a vencer em 30 dias</div>
        </div>
        <div className={`cartao kpi${resumo.processosProblema > 0 ? " alerta" : ""}`}>
          <div className="rotulo">Processos com problema</div>
          <div className="valor">{resumo.processosProblema}</div>
          <div className="apoio">atrasados ou parados</div>
        </div>
      </div>

      {resumo.alertas.length > 0 && (
        <div className="cartao" style={{ marginBottom: 14 }}>
          <h2>⚠ Alertas ({resumo.alertas.length})</h2>
          <div className="lista-alertas">
            {resumo.alertas.map((a, i) => (
              <div key={i} className={`alerta-item ${a.gravidade}`}>
                <span className="icone" aria-hidden="true">
                  {a.gravidade === "critico" ? "⛔" : a.gravidade === "serio" ? "⚠" : "◔"}
                </span>
                <span>
                  <span className="quem">{a.quem}</span> — {a.texto}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grade duas">
        <div className="cartao">
          <h2>Fila de aprovações (mais urgentes)</h2>
          {resumo.fila.length === 0 ? (
            <div className="vazio">Nada aguardando sua decisão. 🎉</div>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th className="num">Valor</th>
                  <th>Prazo</th>
                </tr>
              </thead>
              <tbody>
                {resumo.fila.map((a) => {
                  const atrasada = diasEntre(a.prazoResposta, hoje) > 0;
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="principal">{a.tipo}</div>
                        <div className="secundario">
                          {a.descricao} · {resumo.nomeDe(a.solicitanteId)}
                        </div>
                      </td>
                      <td className="num">{fmtBRL(a.valor)}</td>
                      <td>
                        <Badge tom={atrasada ? "critico" : "neutro"}>
                          {fmtPrazo(a.prazoResposta)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="cartao">
          <h2>Equipe e folha por área</h2>
          {resumo.areas.length === 0 ? (
            <div className="vazio">Cadastre pessoas para ver a distribuição.</div>
          ) : (
            <>
              <Barras
                itens={resumo.areas.map(([area, v]) => ({
                  nome: area,
                  valor: v.folha,
                  formatado: `${fmtBRL(v.folha)} · ${fmtNum(v.pessoas)} ${v.pessoas === 1 ? "pessoa" : "pessoas"}`,
                }))}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
