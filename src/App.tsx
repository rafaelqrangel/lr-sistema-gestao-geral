import { useEffect, useMemo, useState } from "react";
import type { Banco } from "./types";
import { carregarBanco, salvarBanco } from "./lib/armazenamento";
import { bancoExemplo } from "./lib/exemplo";
import { hojeISO } from "./lib/datas";
import { situacaoFerias } from "./lib/ferias";
import { VisaoGeral } from "./views/VisaoGeral";
import { Pessoas } from "./views/Pessoas";
import { FeriasView } from "./views/FeriasView";
import { Processos } from "./views/Processos";
import { Aprovacoes } from "./views/Aprovacoes";
import { Performance } from "./views/Performance";
import { DadosView } from "./views/Dados";

/** Contrato que todas as telas recebem. */
export interface Dados {
  banco: Banco;
  atualizar: (fn: (b: Banco) => Banco) => void;
}

type Tela =
  | "visao"
  | "pessoas"
  | "ferias"
  | "processos"
  | "aprovacoes"
  | "performance"
  | "dados";

const TELAS: { id: Tela; rotulo: string; icone: string }[] = [
  { id: "visao", rotulo: "Visão geral", icone: "◧" },
  { id: "pessoas", rotulo: "Pessoas", icone: "◉" },
  { id: "ferias", rotulo: "Férias", icone: "☀" },
  { id: "processos", rotulo: "Processos", icone: "⚙" },
  { id: "aprovacoes", rotulo: "Aprovações", icone: "✓" },
  { id: "performance", rotulo: "Performance", icone: "▲" },
  { id: "dados", rotulo: "Dados & Power BI", icone: "⇅" },
];

export default function App() {
  const [banco, setBanco] = useState<Banco>(carregarBanco);
  const [tela, setTela] = useState<Tela>("visao");

  useEffect(() => {
    salvarBanco(banco);
  }, [banco]);

  const dados: Dados = useMemo(
    () => ({ banco, atualizar: (fn) => setBanco((b) => fn(b)) }),
    [banco],
  );

  const pendencias = useMemo(() => {
    const hoje = hojeISO();
    const aprovacoesPendentes = banco.aprovacoes.filter(
      (a) => a.status === "Pendente" || a.status === "Em análise",
    ).length;
    const feriasRisco = banco.pessoas.filter((p) => {
      if (p.status === "Desligado" || p.regime !== "CLT") return false;
      const s = situacaoFerias(p, banco.ferias.filter((f) => f.pessoaId === p.id), hoje);
      return s.risco === "Vencido" || s.risco === "Crítico";
    }).length;
    const processosProblema = banco.processos.filter(
      (p) => p.status === "Atrasado" || p.status === "Parado",
    ).length;
    return { aprovacoes: aprovacoesPendentes, ferias: feriasRisco, processos: processosProblema };
  }, [banco]);

  const contadores: Partial<Record<Tela, number>> = {
    aprovacoes: pendencias.aprovacoes,
    ferias: pendencias.ferias,
    processos: pendencias.processos,
  };

  const vazio = banco.pessoas.length === 0 && banco.processos.length === 0;

  return (
    <>
      <nav className="nav">
        <div className="nav-titulo">
          Painel de Gestão
          <small>pessoas · processos · performance</small>
        </div>
        {TELAS.map((t) => (
          <button
            key={t.id}
            className={tela === t.id ? "ativo" : ""}
            onClick={() => setTela(t.id)}
          >
            <span aria-hidden="true">{t.icone}</span>
            {t.rotulo}
            {contadores[t.id] ? <span className="cont">{contadores[t.id]}</span> : null}
          </button>
        ))}
        <div className="nav-rodape">
          Dados salvos neste navegador.
          <br />
          Backup em “Dados &amp; Power BI”.
        </div>
      </nav>

      <main className="conteudo">
        {vazio && tela !== "dados" ? (
          <BoasVindas
            carregarExemplo={() => setBanco(bancoExemplo())}
            irParaDados={() => setTela("dados")}
          />
        ) : (
          <>
            {tela === "visao" && <VisaoGeral dados={dados} />}
            {tela === "pessoas" && <Pessoas dados={dados} />}
            {tela === "ferias" && <FeriasView dados={dados} />}
            {tela === "processos" && <Processos dados={dados} />}
            {tela === "aprovacoes" && <Aprovacoes dados={dados} />}
            {tela === "performance" && <Performance dados={dados} />}
            {tela === "dados" && <DadosView dados={dados} />}
          </>
        )}
      </main>
    </>
  );
}

function BoasVindas({
  carregarExemplo,
  irParaDados,
}: {
  carregarExemplo: () => void;
  irParaDados: () => void;
}) {
  return (
    <div className="cartao" style={{ maxWidth: 560, margin: "60px auto", textAlign: "center" }}>
      <h1 style={{ fontSize: 20, marginTop: 8 }}>Bem-vindo ao seu Painel de Gestão</h1>
      <p style={{ color: "var(--ink-2)" }}>
        Um lugar só para acompanhar sua equipe (férias, salários, atribuições),
        os processos que cada um roda, sua fila de aprovações e a performance do time.
      </p>
      <p style={{ color: "var(--ink-2)" }}>
        Comece com dados de exemplo para explorar, ou cadastre sua equipe do zero
        na aba <strong>Pessoas</strong>. Tudo fica salvo neste navegador — e pode ser
        exportado para Excel / Power BI a qualquer momento.
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
        <button className="botao primario" onClick={carregarExemplo}>
          Carregar dados de exemplo
        </button>
        <button className="botao" onClick={irParaDados}>
          Importar um backup
        </button>
      </div>
    </div>
  );
}
