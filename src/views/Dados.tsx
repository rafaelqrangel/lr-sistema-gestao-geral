import { useRef, useState } from "react";
import type { Dados } from "../App";
import {
  exportarCSVs,
  exportarJSON,
  importarJSON,
  limparBanco,
} from "../lib/armazenamento";
import { bancoExemplo } from "../lib/exemplo";
import { BANCO_VAZIO } from "../types";

export function DadosView({ dados }: { dados: Dados }) {
  const { banco, atualizar } = dados;
  const inputArquivo = useRef<HTMLInputElement>(null);
  const [mensagem, setMensagem] = useState("");

  const importar = async (arquivo: File) => {
    try {
      const novo = await importarJSON(arquivo);
      if (
        banco.pessoas.length > 0 &&
        !window.confirm(
          "Importar vai SUBSTITUIR todos os dados atuais deste navegador. Continuar?",
        )
      ) {
        return;
      }
      atualizar(() => novo);
      setMensagem(
        `✓ Backup importado: ${novo.pessoas.length} pessoas, ${novo.processos.length} processos, ${novo.aprovacoes.length} aprovações.`,
      );
    } catch (e) {
      setMensagem(`✕ Erro ao importar: ${e instanceof Error ? e.message : "arquivo inválido"}`);
    }
  };

  const zerar = () => {
    if (
      !window.confirm(
        "Apagar TODOS os dados deste navegador? Essa ação não tem volta.\n\nSe ainda não exportou um backup JSON, cancele e exporte antes.",
      )
    ) {
      return;
    }
    limparBanco();
    atualizar(() => structuredClone(BANCO_VAZIO));
    setMensagem("✓ Dados apagados.");
  };

  const total =
    banco.pessoas.length +
    banco.ferias.length +
    banco.processos.length +
    banco.aprovacoes.length +
    banco.avaliacoes.length;

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Dados &amp; Power BI</h1>
        <div className="sub">
          Backup, restauração e a ponte com o seu Microsoft 365.
        </div>
      </div>

      {mensagem && (
        <div className="cartao" style={{ marginBottom: 14, fontWeight: 600 }}>
          {mensagem}
        </div>
      )}

      <div className="grade duas">
        <div className="cartao">
          <h2>Exportar</h2>
          <p style={{ color: "var(--ink-2)", marginTop: 0 }}>
            Hoje o painel guarda <strong>{total} registros</strong> neste navegador
            (pessoas: {banco.pessoas.length}, férias: {banco.ferias.length}, processos:{" "}
            {banco.processos.length}, aprovações: {banco.aprovacoes.length}, avaliações:{" "}
            {banco.avaliacoes.length}).
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="botao primario" onClick={() => exportarJSON(banco)}>
              ⬇ Backup completo (JSON)
            </button>
            <button className="botao" onClick={() => exportarCSVs(banco)}>
              ⬇ 5 arquivos CSV (Excel / Power BI)
            </button>
          </div>
          <p style={{ color: "var(--ink-mute)", fontSize: 12.5 }}>
            O JSON é o backup fiel — guarde no OneDrive. Os CSVs abrem direto no
            Excel (separador “;”) e servem de fonte para o Power BI.
          </p>
        </div>

        <div className="cartao">
          <h2>Importar / zerar</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="botao" onClick={() => inputArquivo.current?.click()}>
              ⬆ Restaurar backup JSON
            </button>
            <button className="botao" onClick={() => {
              if (
                banco.pessoas.length === 0 ||
                window.confirm("Substituir os dados atuais pelos dados de exemplo?")
              ) {
                atualizar(() => bancoExemplo());
                setMensagem("✓ Dados de exemplo carregados.");
              }
            }}>
              Carregar dados de exemplo
            </button>
            <button className="botao perigo" onClick={zerar}>
              Apagar tudo
            </button>
          </div>
          <input
            ref={inputArquivo}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importar(f);
              e.target.value = "";
            }}
          />
          <p style={{ color: "var(--ink-mute)", fontSize: 12.5 }}>
            Os dados vivem só neste navegador (localStorage). Trocou de máquina ou
            limpou o cache? Restaure pelo backup JSON.
          </p>
        </div>
      </div>

      <div className="cartao" style={{ marginTop: 14 }}>
        <h2>Como ligar no seu Microsoft 365</h2>
        <ol style={{ color: "var(--ink-2)", lineHeight: 1.7, paddingLeft: 20, margin: 0 }}>
          <li>
            <strong>Power BI:</strong> exporte os 5 CSVs e salve numa pasta do{" "}
            <strong>OneDrive</strong> (ex.: <code>Documentos/PainelGestao/</code>). No Power BI
            Desktop: <em>Obter dados → Texto/CSV</em>, aponte para cada arquivo e marque
            atualização. Re-exportar os CSVs por cima atualiza o relatório.
          </li>
          <li>
            <strong>SharePoint/Teams:</strong> o arquivo <code>dist/index.html</code> deste
            projeto é o painel inteiro. Você pode guardá-lo numa biblioteca do SharePoint e
            abri-lo localmente, ou fixar como guia no Teams para o time consultar.
          </li>
          <li>
            <strong>Coleta com Forms:</strong> para pedidos de aprovação (viagem, reembolso),
            um Microsoft Forms preenchido pelo time gera um Excel no OneDrive — e você
            registra aqui só o que chega para decidir.
          </li>
          <li>
            <strong>Evolução futura:</strong> quando o painel precisar ser multiusuário, o
            caminho natural no seu plano é migrar estas tabelas para{" "}
            <strong>Listas do SharePoint</strong> (Pessoas, Férias, Processos, Aprovações,
            Avaliações) — o Power BI também lê Listas direto.
          </li>
        </ol>
      </div>

      <div className="cartao" style={{ marginTop: 14 }}>
        <h2>Privacidade</h2>
        <p style={{ color: "var(--ink-2)", margin: 0 }}>
          Salários e avaliações são dados sensíveis. Este painel não envia nada para
          internet — tudo fica no seu navegador. Ao exportar CSVs, trate os arquivos
          com o mesmo cuidado de uma planilha de RH: pasta restrita no OneDrive, sem
          compartilhamento amplo.
        </p>
      </div>
    </>
  );
}
