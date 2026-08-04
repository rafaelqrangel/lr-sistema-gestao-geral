/**
 * Sincronização automática.
 *
 * Ao abrir, o painel busca a versão do GitHub; depois de cada edição,
 * espera alguns segundos de silêncio e salva sozinho. O usuário não
 * precisa lembrar de nada — e, se houver conflito, o envio para e avisa
 * em vez de sobrescrever.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Banco } from "../types";
import { lerToken, type AlvoGit } from "./github";
import {
  baixarTudo,
  enviarTudo,
  mensagemDoErro,
  type EstadoSync,
} from "./sincronizacao";

/** Silêncio de digitação antes de salvar sozinho. */
const ESPERA_MS = 4000;

function alvoDe(banco: Banco): AlvoGit | null {
  const token = lerToken().trim();
  const { owner, repo, branch } = banco.git;
  if (!owner.trim() || !repo.trim() || !token) return null;
  return {
    owner: owner.trim(),
    repo: repo.trim(),
    branch: branch.trim() || "main",
    token,
  };
}

export interface Sincronizacao {
  estado: EstadoSync;
  /** Envia agora, sem esperar o temporizador. */
  enviarAgora: () => Promise<void>;
  /** Busca a versão do servidor e substitui a local. */
  baixarAgora: () => Promise<void>;
  /** Reenvia assumindo a versão do servidor (usado após resolver conflito). */
  descartarConflito: () => Promise<void>;
}

export function usarSincronizacao(
  banco: Banco,
  aplicar: (b: Banco) => void,
): Sincronizacao {
  const [estado, setEstado] = useState<EstadoSync>({ tipo: "desligado" });

  // Refs para o temporizador enxergar sempre o banco mais recente sem
  // reagendar a cada tecla digitada.
  const bancoRef = useRef(banco);
  bancoRef.current = banco;
  const emVoo = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const jaBaixou = useRef(false);

  const enviar = useCallback(async () => {
    const atual = bancoRef.current;
    const alvo = alvoDe(atual);
    if (!alvo || !atual.git.autoSync) return;
    if (emVoo.current) return;

    emVoo.current = true;
    setEstado({ tipo: "enviando" });
    try {
      const r = await enviarTudo(alvo, atual);
      // Reaplica sobre o banco vigente: o usuário pode ter digitado
      // enquanto a requisição corria, e essas edições não podem sumir.
      aplicar({
        ...bancoRef.current,
        atas: r.banco.atas,
        git: r.banco.git,
      });
      setEstado({ tipo: "salvo", em: new Date().toISOString() });
    } catch (e) {
      const msg = mensagemDoErro(e);
      setEstado(
        msg.includes("versão mais nova")
          ? { tipo: "conflito", mensagem: msg }
          : { tipo: "erro", mensagem: msg },
      );
    } finally {
      emVoo.current = false;
    }
  }, [aplicar]);

  const baixar = useCallback(async () => {
    const atual = bancoRef.current;
    const alvo = alvoDe(atual);
    if (!alvo) return;
    setEstado({ tipo: "baixando" });
    try {
      const r = await baixarTudo(alvo, atual);
      aplicar(r.banco);
      setEstado({ tipo: "ocioso" });
    } catch (e) {
      setEstado({ tipo: "erro", mensagem: mensagemDoErro(e) });
    }
  }, [aplicar]);

  /** Aceita a versão do servidor como base e reenvia o que está local. */
  const descartarConflito = useCallback(async () => {
    const atual = bancoRef.current;
    const alvo = alvoDe(atual);
    if (!alvo) return;
    setEstado({ tipo: "enviando" });
    try {
      // Lê o sha atual do servidor e adota como base — o conteúdo enviado
      // continua sendo o deste aparelho, por decisão explícita do usuário.
      const r = await baixarTudo(alvo, atual);
      const rebaseado: Banco = {
        ...bancoRef.current,
        git: { ...bancoRef.current.git, shaBanco: r.banco.git.shaBanco },
      };
      const envio = await enviarTudo(alvo, rebaseado);
      aplicar({ ...bancoRef.current, atas: envio.banco.atas, git: envio.banco.git });
      setEstado({ tipo: "salvo", em: new Date().toISOString() });
    } catch (e) {
      setEstado({ tipo: "erro", mensagem: mensagemDoErro(e) });
    }
  }, [aplicar]);

  // Busca a versão do servidor uma vez, ao abrir.
  useEffect(() => {
    if (jaBaixou.current) return;
    const alvo = alvoDe(bancoRef.current);
    if (!alvo || !bancoRef.current.git.autoSync) {
      setEstado(alvo ? { tipo: "ocioso" } : { tipo: "desligado" });
      return;
    }
    jaBaixou.current = true;
    void baixar();
  }, [baixar, banco.git.owner, banco.git.repo, banco.git.autoSync]);

  // Agenda o envio automático a cada mudança de dados.
  useEffect(() => {
    const alvo = alvoDe(banco);
    if (!alvo) {
      setEstado({ tipo: "desligado" });
      return;
    }
    if (!banco.git.autoSync) return;
    // A primeira baixa ainda não terminou: não empurra por cima dela.
    if (!jaBaixou.current) return;

    setEstado((e) =>
      e.tipo === "conflito" || e.tipo === "baixando" ? e : { tipo: "pendente" },
    );
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void enviar();
    }, ESPERA_MS);

    return () => window.clearTimeout(timer.current);
    // `atualizadoEm` muda a cada gravação local: é o gatilho natural.
  }, [banco.atualizadoEm, banco.git.autoSync, banco.git.owner, banco.git.repo, enviar]);

  // Última tentativa de salvar quando a aba fecha ou vai para segundo plano.
  useEffect(() => {
    const aoSair = () => {
      if (estado.tipo === "pendente") void enviar();
    };
    window.addEventListener("pagehide", aoSair);
    return () => window.removeEventListener("pagehide", aoSair);
  }, [estado.tipo, enviar]);

  return { estado, enviarAgora: enviar, baixarAgora: baixar, descartarConflito };
}
