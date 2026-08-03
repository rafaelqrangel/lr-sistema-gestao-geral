/**
 * Dados — backup local, exports e sincronização com o GitHub.
 *
 * A sincronização transforma o repositório em servidor: o banco vira um
 * JSON versionado e cada ata vira um .md sob a pasta do seu processo. É o
 * que permite abrir o painel de outra máquina sem instalar nada.
 */

import { useRef, useState } from "react";
import type { Dados } from "../App";
import {
  exportarCSVs,
  exportarJSON,
  importarJSON,
  limparBanco,
  serializar,
} from "../lib/armazenamento";
import { bancoExemplo } from "../lib/exemplo";
import { ataParaMarkdown, nomeArquivoAta, pastaDoProcesso } from "../lib/atas";
import {
  ErroGit,
  gravarArquivo,
  gravarToken,
  lerArquivo,
  lerToken,
  testarAcesso,
  urlDaPasta,
  type AlvoGit,
} from "../lib/github";
import { migrar } from "../lib/migracao";
import { BANCO_VAZIO, type Banco, type ConfigGit } from "../types";

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
        `✓ Backup importado: ${novo.pessoas.length} pessoas, ${novo.cargos.length} cargos, ${novo.processos.length} processos.`,
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
    banco.cargos.length +
    banco.pessoas.length +
    banco.ferias.length +
    banco.processos.length +
    banco.atas.length +
    banco.aprovacoes.length +
    banco.eventos.length +
    banco.avaliacoes.length;

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Dados, GitHub &amp; Power BI</h1>
        <div className="sub">
          Backup, sincronização com o repositório e a ponte com o seu Microsoft 365.
        </div>
      </div>

      {mensagem && (
        <div className="cartao" style={{ marginBottom: 14, fontWeight: 600 }}>
          {mensagem}
        </div>
      )}

      <SincronizacaoGit dados={dados} aoAvisar={setMensagem} />

      <div className="grade duas" style={{ marginTop: 14 }}>
        <div className="cartao">
          <h2>Exportar</h2>
          <p style={{ color: "var(--ink-2)", marginTop: 0 }}>
            Hoje o painel guarda <strong>{total} registros</strong> neste navegador
            (cargos: {banco.cargos.length}, pessoas: {banco.pessoas.length}, processos:{" "}
            {banco.processos.length}, atas: {banco.atas.length}, aprovações:{" "}
            {banco.aprovacoes.length}).
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="botao primario" onClick={() => exportarJSON(banco)}>
              ⬇ Backup completo (JSON)
            </button>
            <button className="botao" onClick={() => exportarCSVs(banco)}>
              ⬇ CSVs (Excel / Power BI)
            </button>
          </div>
          <p style={{ color: "var(--ink-mute)", fontSize: 12.5 }}>
            O JSON é o backup fiel. Os CSVs — cargos, quadro de pessoal, faixas,
            férias, processos, KPIs, atas, aprovações e avaliações — abrem direto
            no Excel (separador “;”) e servem de fonte para o Power BI.
          </p>
        </div>

        <div className="cartao">
          <h2>Importar / zerar</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="botao" onClick={() => inputArquivo.current?.click()}>
              ⬆ Restaurar backup JSON
            </button>
            <button
              className="botao"
              onClick={() => {
                if (
                  banco.pessoas.length === 0 ||
                  window.confirm("Substituir os dados atuais pela arquitetura LR Nordeste?")
                ) {
                  atualizar(() => bancoExemplo());
                  setMensagem("✓ Arquitetura de cargos LR Nordeste carregada.");
                }
              }}
            >
              Carregar arquitetura LR Nordeste
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
            Sem sincronização ligada, os dados vivem só neste navegador. Trocou de
            máquina ou limpou o cache? Restaure pelo backup JSON.
          </p>
        </div>
      </div>

      <div className="cartao" style={{ marginTop: 14 }}>
        <h2>Como ligar no seu Microsoft 365</h2>
        <ol style={{ color: "var(--ink-2)", lineHeight: 1.7, paddingLeft: 20, margin: 0 }}>
          <li>
            <strong>Power BI:</strong> exporte os CSVs para uma pasta do{" "}
            <strong>OneDrive</strong> (ex.: <code>Documentos/PainelGestao/</code>). No Power BI
            Desktop: <em>Obter dados → Texto/CSV</em>. Re-exportar por cima atualiza o relatório.
          </li>
          <li>
            <strong>Abrir como app no Mac:</strong> com a sincronização ligada, publique
            este HTML numa URL (GitHub Pages ou OneDrive) e use{" "}
            <em>Safari → Compartilhar → Adicionar ao Dock</em>. Vira ícone de aplicativo
            sem instalar nada — não depende do admin da rede.
          </li>
          <li>
            <strong>Coleta com Forms:</strong> um Microsoft Forms preenchido pelo time
            gera um Excel no OneDrive — e você registra aqui só o que chega para decidir.
            Pedidos que chegam por e-mail entram por “Importar de e-mail” nas Aprovações.
          </li>
          <li>
            <strong>Multiusuário:</strong> quando o time todo precisar editar ao mesmo
            tempo, o caminho no seu plano é migrar as tabelas para{" "}
            <strong>Listas do SharePoint</strong> — o Power BI lê Listas direto.
          </li>
        </ol>
      </div>

      <div className="cartao" style={{ marginTop: 14 }}>
        <h2>Privacidade</h2>
        <p style={{ color: "var(--ink-2)", margin: 0 }}>
          Salários e avaliações são dados sensíveis. Sem sincronização, nada sai do
          seu navegador. Com sincronização ligada, o banco vai para o repositório que
          você indicar — use um <strong>repositório privado</strong>. O token fica
          guardado só neste navegador e nunca entra no backup JSON nem nos CSVs.
        </p>
      </div>
    </>
  );
}

// ------------------------------------------------------- Sincronização Git

function SincronizacaoGit({
  dados,
  aoAvisar,
}: {
  dados: Dados;
  aoAvisar: (m: string) => void;
}) {
  const { banco, atualizar } = dados;
  const [token, setToken] = useState(lerToken);
  const [ocupado, setOcupado] = useState("");
  const [status, setStatus] = useState("");

  const config = banco.git;
  const configurado = Boolean(config.owner && config.repo && token);

  const alvo = (): AlvoGit => ({
    owner: config.owner.trim(),
    repo: config.repo.trim(),
    branch: config.branch.trim() || "main",
    token: token.trim(),
  });

  const editarConfig = (campo: keyof ConfigGit, valor: string) =>
    atualizar((b) => ({ ...b, git: { ...b.git, [campo]: valor } }));

  const salvarToken = (valor: string) => {
    setToken(valor);
    gravarToken(valor.trim());
  };

  const caminhoBanco = `${config.pasta || "gestao"}/banco.json`;

  const executar = async (rotulo: string, fn: () => Promise<string>) => {
    setOcupado(rotulo);
    setStatus("");
    try {
      const resultado = await fn();
      setStatus(`✓ ${resultado}`);
      aoAvisar(`✓ ${resultado}`);
    } catch (e) {
      const msg = e instanceof ErroGit ? e.message : "Falha inesperada na sincronização.";
      setStatus(`✕ ${msg}`);
      aoAvisar(`✕ ${msg}`);
    } finally {
      setOcupado("");
    }
  };

  const testar = () =>
    executar("testar", async () => `Conectado a ${await testarAcesso(alvo())}`);

  /** Envia o banco e todas as atas ainda não sincronizadas. */
  const enviar = () =>
    executar("enviar", async () => {
      const a = alvo();
      const agora = new Date().toISOString();
      await gravarArquivo(
        a,
        caminhoBanco,
        serializar(banco),
        `Painel de gestão: atualiza banco (${agora.slice(0, 16).replace("T", " ")})`,
      );

      const enviadas: string[] = [];
      for (const ata of banco.atas) {
        const processo = banco.processos.find((p) => p.id === ata.processoId);
        const caminho = `${config.pasta || "gestao"}/atas/${pastaDoProcesso(processo, ata.processoId)}/${nomeArquivoAta(ata, processo)}`;
        await gravarArquivo(
          a,
          caminho,
          ataParaMarkdown(ata, processo, banco.pessoas),
          `Ata: ${processo?.nome ?? "processo"} — ${ata.data}`,
        );
        enviadas.push(ata.id);
      }

      atualizar((b) => ({
        ...b,
        git: { ...b.git, ultimaSync: agora },
        atas: b.atas.map((at) =>
          enviadas.includes(at.id)
            ? {
                ...at,
                sincronizadaEm: agora,
                caminhoGit: `${config.pasta || "gestao"}/atas/${pastaDoProcesso(
                  b.processos.find((p) => p.id === at.processoId),
                  at.processoId,
                )}/${nomeArquivoAta(at, b.processos.find((p) => p.id === at.processoId))}`,
              }
            : at,
        ),
      }));

      return `Enviado: banco + ${enviadas.length} ata(s).`;
    });

  /** Traz o banco do repositório, substituindo o que está neste navegador. */
  const baixar = () =>
    executar("baixar", async () => {
      const arquivo = await lerArquivo(alvo(), caminhoBanco);
      if (!arquivo) {
        throw new ErroGit(
          `Nenhum banco encontrado em ${caminhoBanco}. Use “Enviar” primeiro.`,
        );
      }
      const remoto = migrar(JSON.parse(arquivo.conteudo)) as Banco;
      if (
        banco.pessoas.length > 0 &&
        !window.confirm(
          "Baixar vai SUBSTITUIR os dados deste navegador pelos do GitHub. Continuar?",
        )
      ) {
        return "Download cancelado.";
      }
      // A config local de Git prevalece: o token e o alvo são desta máquina.
      atualizar(() => ({ ...remoto, git: { ...banco.git, ultimaSync: new Date().toISOString() } }));
      return `Baixado: ${remoto.pessoas.length} pessoas, ${remoto.processos.length} processos, ${remoto.atas.length} atas.`;
    });

  const naoSincronizadas = banco.atas.filter((a) => !a.sincronizadaEm).length;

  return (
    <div className="cartao">
      <h2>Sincronizar com o GitHub</h2>
      <p style={{ color: "var(--ink-2)", marginTop: 0 }}>
        O repositório passa a guardar o banco e o histórico de atas. Assim o
        painel abre de qualquer máquina, cada ata fica versionada por processo e
        o backup é automático — sem servidor e sem instalar nada.
      </p>

      <div className="form-grade">
        <Campo2 label="Owner (usuário ou organização)">
          <input
            value={config.owner}
            onChange={(e) => editarConfig("owner", e.target.value)}
            placeholder="rafaelqrangel"
          />
        </Campo2>
        <Campo2 label="Repositório (privado, de preferência)">
          <input
            value={config.repo}
            onChange={(e) => editarConfig("repo", e.target.value)}
            placeholder="lr-sistema-gestao-geral"
          />
        </Campo2>
        <Campo2 label="Branch">
          <input
            value={config.branch}
            onChange={(e) => editarConfig("branch", e.target.value)}
            placeholder="main"
          />
        </Campo2>
        <Campo2 label="Pasta no repositório">
          <input
            value={config.pasta}
            onChange={(e) => editarConfig("pasta", e.target.value)}
            placeholder="gestao"
          />
        </Campo2>
        <Campo2 label="Token de acesso (fine-grained PAT)" largo>
          <input
            type="password"
            value={token}
            onChange={(e) => salvarToken(e.target.value)}
            placeholder="github_pat_…"
            autoComplete="off"
          />
        </Campo2>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button className="botao" onClick={testar} disabled={!configurado || Boolean(ocupado)}>
          {ocupado === "testar" ? "Testando…" : "Testar conexão"}
        </button>
        <button
          className="botao primario"
          onClick={enviar}
          disabled={!configurado || Boolean(ocupado)}
        >
          {ocupado === "enviar" ? "Enviando…" : "⬆ Enviar para o GitHub"}
        </button>
        <button className="botao" onClick={baixar} disabled={!configurado || Boolean(ocupado)}>
          {ocupado === "baixar" ? "Baixando…" : "⬇ Baixar do GitHub"}
        </button>
        {configurado && (
          <a
            className="botao"
            href={urlDaPasta(config.owner, config.repo, config.branch || "main", `${config.pasta || "gestao"}/atas`)}
            target="_blank"
            rel="noreferrer"
          >
            Abrir histórico de atas ↗
          </a>
        )}
      </div>

      {status && (
        <p style={{ marginBottom: 0, fontWeight: 600 }}>{status}</p>
      )}

      <p style={{ color: "var(--ink-mute)", fontSize: 12.5 }}>
        {config.ultimaSync
          ? `Última sincronização: ${new Date(config.ultimaSync).toLocaleString("pt-BR")}. `
          : "Ainda não sincronizado. "}
        {naoSincronizadas > 0 && `${naoSincronizadas} ata(s) só neste navegador. `}
        Envie sempre depois de mexer nos dados: o GitHub não puxa sozinho.
      </p>

      <details>
        <summary style={{ cursor: "pointer" }}>Como criar o token (2 minutos)</summary>
        <ol style={{ color: "var(--ink-2)", lineHeight: 1.7, paddingLeft: 20 }}>
          <li>
            No GitHub: <em>Settings → Developer settings → Personal access tokens →
            Fine-grained tokens → Generate new token</em>.
          </li>
          <li>
            Em <em>Repository access</em>, escolha <strong>Only select repositories</strong>{" "}
            e marque apenas este repositório.
          </li>
          <li>
            Em <em>Permissions → Repository permissions</em>, dê{" "}
            <strong>Contents: Read and write</strong>. Nenhuma outra permissão é
            necessária.
          </li>
          <li>
            Defina uma validade (90 dias é um bom padrão), gere e cole o token acima.
            Quando expirar, gere outro — o painel avisa com erro de token inválido.
          </li>
        </ol>
        <p style={{ color: "var(--ink-mute)", fontSize: 12.5 }}>
          O token dá acesso de escrita ao repositório: trate como senha. Ele fica
          apenas neste navegador e nunca é exportado. Se o Mac for compartilhado,
          prefira não salvar e colar a cada uso.
        </p>
      </details>
    </div>
  );
}

/** Campo local — evita importar o layout de formulário só por dois usos. */
function Campo2({
  label,
  largo,
  children,
}: {
  label: string;
  largo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`campo${largo ? " largo" : ""}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}
