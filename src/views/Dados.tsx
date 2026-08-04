/**
 * Dados — sincronização, backup e exports.
 *
 * A sincronização transforma o repositório em servidor: o banco vira um
 * JSON versionado e cada ata vira um .md sob a pasta do seu processo. É o
 * que permite abrir o painel de qualquer aparelho sem instalar nada.
 */

import { useRef, useState } from "react";
import type { Dados } from "../App";
import {
  exportarCSVs,
  exportarJSON,
  importarJSON,
  limparBanco,
} from "../lib/armazenamento";
import { bancoExemplo } from "../lib/exemplo";
import {
  ErroGit,
  gravarToken,
  lerToken,
  testarAcesso,
  urlDaPasta,
  urlDoHistorico,
  type AlvoGit,
} from "../lib/github";
import { caminhoDoBanco, rotuloEstado, tomEstado } from "../lib/sincronizacao";
import { Badge } from "../components/ui";
import { BANCO_VAZIO, type ConfigGit } from "../types";

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
          "Importar vai SUBSTITUIR todos os dados deste aparelho. Continuar?",
        )
      ) {
        return;
      }
      atualizar(() => ({ ...novo, git: banco.git }));
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
        "Apagar TODOS os dados deste aparelho? Essa ação não tem volta aqui.\n\nSe a sincronização estiver ligada, a versão do GitHub continua lá e pode ser trazida de volta.",
      )
    ) {
      return;
    }
    limparBanco();
    atualizar(() => ({ ...structuredClone(BANCO_VAZIO), git: banco.git }));
    setMensagem("✓ Dados apagados deste aparelho.");
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
          Onde seus dados ficam guardados e como levá-los para outros aparelhos.
        </div>
      </div>

      {mensagem && (
        <div className="cartao" style={{ marginBottom: 14, fontWeight: 600 }}>
          {mensagem}
        </div>
      )}

      <SincronizacaoGit dados={dados} />

      <div className="grade duas" style={{ marginTop: 14 }}>
        <div className="cartao">
          <h2>Backup manual</h2>
          <p style={{ color: "var(--ink-2)", marginTop: 0 }}>
            Hoje o painel guarda <strong>{total} registros</strong> (cargos:{" "}
            {banco.cargos.length}, pessoas: {banco.pessoas.length}, processos:{" "}
            {banco.processos.length}, atas: {banco.atas.length}).
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="botao primario" onClick={() => exportarJSON(banco)}>
              ⬇ Baixar cópia de tudo (JSON)
            </button>
            <button className="botao" onClick={() => exportarCSVs(banco)}>
              ⬇ Planilhas para Excel / Power BI
            </button>
          </div>
          <p style={{ color: "var(--ink-mute)", fontSize: 12.5 }}>
            Com a sincronização ligada, o GitHub já guarda tudo e o histórico
            completo. Este botão é para quando você quiser uma cópia na mão.
          </p>
        </div>

        <div className="cartao">
          <h2>Importar / recomeçar</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="botao" onClick={() => inputArquivo.current?.click()}>
              ⬆ Restaurar de um arquivo JSON
            </button>
            <button
              className="botao"
              onClick={() => {
                if (
                  banco.pessoas.length === 0 ||
                  window.confirm("Substituir os dados atuais pela arquitetura LR Nordeste?")
                ) {
                  atualizar((b) => ({ ...bancoExemplo(), git: b.git }));
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
        </div>
      </div>

      <div className="cartao" style={{ marginTop: 14 }}>
        <h2>Usar como aplicativo (iPhone, Mac, Windows)</h2>
        <p style={{ color: "var(--ink-2)", marginTop: 0 }}>
          O painel é um site — então não precisa instalar nada nem pedir
          autorização ao administrador da rede. Abra o endereço no navegador e:
        </p>
        <ul style={{ color: "var(--ink-2)", lineHeight: 1.7, paddingLeft: 20, margin: 0 }}>
          <li>
            <strong>iPhone / iPad:</strong> botão Compartilhar →{" "}
            <em>Adicionar à Tela de Início</em>. Vira ícone como qualquer app.
          </li>
          <li>
            <strong>Mac (Safari):</strong> Compartilhar → <em>Adicionar ao Dock</em>.
          </li>
          <li>
            <strong>Windows / Chrome / Edge:</strong> ícone de instalar na barra de
            endereço, ou menu → <em>Instalar</em>.
          </li>
        </ul>
        <p style={{ color: "var(--ink-mute)", fontSize: 12.5 }}>
          Funciona sem internet para consultar e editar; o que você mudar sobe
          assim que a conexão voltar.
        </p>
      </div>

      <div className="cartao" style={{ marginTop: 14 }}>
        <h2>Power BI</h2>
        <p style={{ color: "var(--ink-2)", margin: 0 }}>
          Exporte as planilhas para uma pasta do <strong>OneDrive</strong> e, no
          Power BI Desktop, use <em>Obter dados → Texto/CSV</em>. Re-exportar por
          cima atualiza o relatório.
        </p>
      </div>
    </>
  );
}

// ------------------------------------------------------- Sincronização Git

function SincronizacaoGit({ dados }: { dados: Dados }) {
  const { banco, atualizar, sync } = dados;
  const [token, setToken] = useState(lerToken);
  const [testando, setTestando] = useState(false);
  const [status, setStatus] = useState("");

  const config = banco.git;
  const configurado = Boolean(config.owner.trim() && config.repo.trim() && token.trim());

  const editarConfig = (campo: keyof ConfigGit, valor: string | boolean) =>
    atualizar((b) => ({ ...b, git: { ...b.git, [campo]: valor } }));

  const salvarToken = (valor: string) => {
    setToken(valor);
    gravarToken(valor.trim());
  };

  const testar = async () => {
    setTestando(true);
    setStatus("");
    try {
      const alvo: AlvoGit = {
        owner: config.owner.trim(),
        repo: config.repo.trim(),
        branch: config.branch.trim() || "main",
        token: token.trim(),
      };
      const info = await testarAcesso(alvo);
      atualizar((b) => ({ ...b, git: { ...b.git, repoPrivado: info.privado } }));
      setStatus(
        info.privado
          ? `✓ Conectado a ${info.nome} — repositório privado, adequado para dados de RH.`
          : `⚠ Conectado a ${info.nome}, mas este repositório é PÚBLICO. Qualquer pessoa na internet enxergaria salários e avaliações. Use um repositório privado.`,
      );
    } catch (e) {
      setStatus(`✕ ${e instanceof ErroGit ? e.message : "Falha ao conectar."}`);
    } finally {
      setTestando(false);
    }
  };

  const naoSincronizadas = banco.atas.filter((a) => !a.sincronizadaEm).length;
  const caminho = caminhoDoBanco(config.pasta);
  const publico = config.repoPrivado === false;

  return (
    <div className="cartao">
      <h2>
        Sincronizar entre aparelhos{" "}
        <Badge tom={tomEstado(sync.estado)}>{rotuloEstado(sync.estado)}</Badge>
      </h2>
      <p style={{ color: "var(--ink-2)", marginTop: 0 }}>
        Com isso ligado, seus dados ficam guardados no GitHub em vez de presos
        neste aparelho: você abre no celular, no notebook pessoal e no do
        trabalho vendo sempre a mesma coisa. Cada gravação vira uma versão no
        histórico — <strong>nada é apagado de vez</strong>, dá para voltar atrás.
      </p>

      {publico && (
        <div className="faixa-conflito">
          <strong>⚠ Este repositório é público.</strong> Salários, avaliações e
          dados da equipe ficariam visíveis para qualquer pessoa. Crie um
          repositório <strong>privado</strong> no GitHub e aponte a
          sincronização para ele antes de cadastrar dados reais.
        </div>
      )}

      <div className="form-grade">
        <Campo2 label="Seu usuário do GitHub">
          <input
            value={config.owner}
            onChange={(e) => editarConfig("owner", e.target.value)}
            placeholder="rafaelqrangel"
          />
        </Campo2>
        <Campo2 label="Repositório privado onde os dados ficam">
          <input
            value={config.repo}
            onChange={(e) => editarConfig("repo", e.target.value)}
            placeholder="gestao-dados"
          />
        </Campo2>
        <Campo2 label="Branch">
          <input
            value={config.branch}
            onChange={(e) => editarConfig("branch", e.target.value)}
            placeholder="main"
          />
        </Campo2>
        <Campo2 label="Pasta dentro do repositório">
          <input
            value={config.pasta}
            onChange={(e) => editarConfig("pasta", e.target.value)}
            placeholder="gestao"
          />
        </Campo2>
        <Campo2 label="Senha de acesso do GitHub (token)" largo>
          <input
            type="password"
            value={token}
            onChange={(e) => salvarToken(e.target.value)}
            placeholder="github_pat_…"
            autoComplete="off"
          />
        </Campo2>
      </div>

      <label
        style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13 }}
      >
        <input
          type="checkbox"
          checked={config.autoSync}
          onChange={(e) => editarConfig("autoSync", e.target.checked)}
        />
        Salvar sozinho (recomendado) — grava alguns segundos depois de cada
        alteração e busca a versão mais nova ao abrir.
      </label>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button className="botao" onClick={() => void testar()} disabled={!configurado || testando}>
          {testando ? "Testando…" : "Testar conexão"}
        </button>
        <button
          className="botao primario"
          onClick={() => void sync.enviarAgora()}
          disabled={!configurado}
        >
          ⬆ Salvar agora
        </button>
        <button
          className="botao"
          onClick={() => {
            if (
              window.confirm(
                "Trazer os dados do GitHub vai substituir o que está neste aparelho. Continuar?",
              )
            ) {
              void sync.baixarAgora();
            }
          }}
          disabled={!configurado}
        >
          ⬇ Trazer do GitHub
        </button>
        {configurado && (
          <>
            <a
              className="botao"
              href={urlDoHistorico(config.owner, config.repo, config.branch || "main", caminho)}
              target="_blank"
              rel="noreferrer"
            >
              Ver histórico de versões ↗
            </a>
            <a
              className="botao"
              href={urlDaPasta(config.owner, config.repo, config.branch || "main", `${config.pasta || "gestao"}/atas`)}
              target="_blank"
              rel="noreferrer"
            >
              Ver atas ↗
            </a>
          </>
        )}
      </div>

      {status && <p style={{ marginBottom: 0, fontWeight: 600 }}>{status}</p>}

      <p style={{ color: "var(--ink-mute)", fontSize: 12.5 }}>
        {config.ultimaSync
          ? `Última gravação: ${new Date(config.ultimaSync).toLocaleString("pt-BR")}. `
          : "Ainda não sincronizado. "}
        {naoSincronizadas > 0 && `${naoSincronizadas} ata(s) ainda só neste aparelho. `}
        Se dois aparelhos editarem ao mesmo tempo, o painel <strong>para e
        avisa</strong> em vez de apagar o trabalho de um deles.
      </p>

      <details>
        <summary style={{ cursor: "pointer" }}>
          Passo a passo para ligar (uma vez só, ~5 minutos)
        </summary>
        <ol style={{ color: "var(--ink-2)", lineHeight: 1.8, paddingLeft: 20 }}>
          <li>
            No GitHub, crie um repositório <strong>privado</strong> — por exemplo{" "}
            <code>gestao-dados</code>. É onde a sua informação vai morar. Marque
            a opção <em>Add a README file</em> para ele já nascer com conteúdo.
          </li>
          <li>
            Vá em <em>Settings → Developer settings → Personal access tokens →
            Fine-grained tokens → Generate new token</em>.
          </li>
          <li>
            Em <em>Repository access</em>, escolha{" "}
            <strong>Only select repositories</strong> e marque apenas o
            repositório que você acabou de criar.
          </li>
          <li>
            Em <em>Permissions → Repository permissions → Contents</em>, escolha{" "}
            <strong>Read and write</strong>. Nada além disso é necessário.
          </li>
          <li>
            Escolha a validade (1 ano é confortável), gere, copie e cole o
            código no campo acima. Preencha usuário e repositório, clique em{" "}
            <strong>Testar conexão</strong> e depois em{" "}
            <strong>Salvar agora</strong>.
          </li>
          <li>
            Nos outros aparelhos, abra o mesmo endereço, cole o mesmo código e
            clique em <strong>Trazer do GitHub</strong>.
          </li>
        </ol>
        <p style={{ color: "var(--ink-mute)", fontSize: 12.5 }}>
          Esse código é uma senha: quem tiver ele consegue mexer no
          repositório. Ele fica guardado só no navegador deste aparelho e nunca
          entra nos backups nem nas planilhas exportadas. Quando expirar, o
          painel avisa e você gera outro.
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
