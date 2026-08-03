import type { ReactNode } from "react";
import { useEffect } from "react";

// ------------------------------------------------------------------ Badge

export type TomBadge = "bom" | "atencao" | "serio" | "critico" | "neutro";

export function Badge({ tom, children }: { tom: TomBadge; children: ReactNode }) {
  return <span className={`badge ${tom}`}>{children}</span>;
}

// ------------------------------------------------------------------ Modal

interface ModalProps {
  titulo: string;
  aberto: boolean;
  aoFechar: () => void;
  children: ReactNode;
}

export function Modal({ titulo, aberto, aoFechar, children }: ModalProps) {
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberto, aoFechar]);

  if (!aberto) return null;
  return (
    <div
      className="modal-fundo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Campos

interface CampoProps {
  label: string;
  largo?: boolean;
  children: ReactNode;
}

export function Campo({ label, largo, children }: CampoProps) {
  return (
    <div className={`campo${largo ? " largo" : ""}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}

// ------------------------------------------------------------- Barras (viz)

export interface ItemBarra {
  nome: string;
  valor: number;
  formatado: string;
}

/**
 * Gráfico de barras horizontal em HTML puro, com rótulo direto de valor
 * (sem eixo — o rótulo carrega o número, a barra carrega a proporção).
 */
export function Barras({ itens }: { itens: ItemBarra[] }) {
  const max = Math.max(...itens.map((i) => i.valor), 1);
  return (
    <div className="barras">
      {itens.map((i) => (
        <div key={i.nome} className="barra-linha" title={`${i.nome}: ${i.formatado}`}>
          <div className="barra-nome">{i.nome}</div>
          <div className="barra-trilha">
            <div className="barra-fill" style={{ width: `${(i.valor / max) * 100}%` }} />
            <div className="barra-valor">{i.formatado}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Vazio

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="vazio">{children}</div>;
}

// -------------------------------------------------------------- Sub-abas

export interface Aba<T extends string> {
  id: T;
  rotulo: string;
  contador?: number;
}

export function Abas<T extends string>({
  abas,
  ativa,
  aoTrocar,
}: {
  abas: Aba<T>[];
  ativa: T;
  aoTrocar: (id: T) => void;
}) {
  return (
    <div className="filtros">
      {abas.map((a) => (
        <button
          key={a.id}
          className={`botao mini${ativa === a.id ? " primario" : ""}`}
          onClick={() => aoTrocar(a.id)}
        >
          {a.rotulo}
          {a.contador !== undefined ? ` (${a.contador})` : ""}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------- Lista multilinha

/**
 * Edita uma lista de textos curtos (atribuições, entregáveis) como uma
 * linha por item — mais rápido de digitar do que campos separados.
 */
export function ListaTexto({
  valor,
  aoMudar,
  linhas = 3,
  dica,
}: {
  valor: string[];
  aoMudar: (v: string[]) => void;
  linhas?: number;
  dica?: string;
}) {
  return (
    <textarea
      rows={linhas}
      placeholder={dica ?? "Um item por linha"}
      value={valor.join("\n")}
      onChange={(e) =>
        aoMudar(
          e.target.value
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
        )
      }
    />
  );
}
