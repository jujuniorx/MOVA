import { useEffect } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  titulo: string;
  aberto: boolean;
  aoFechar: () => void;
  children: ReactNode;
  tamanho?: "padrao" | "grande";
}

const larguraPorTamanho = {
  padrao: "max-w-md",
  grande: "max-w-2xl",
};

export function Modal({ titulo, aberto, aoFechar, children, tamanho = "padrao" }: ModalProps) {
  useEffect(() => {
    if (!aberto) return;

    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") aoFechar();
    }

    document.addEventListener("keydown", aoPressionarTecla);
    return () => document.removeEventListener("keydown", aoPressionarTecla);
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 px-4 py-6 motion-safe:animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`flex max-h-[90vh] w-full flex-col rounded-xl bg-surface shadow-xl motion-safe:animate-fade-in-up ${larguraPorTamanho[tamanho]}`}
      >
        <div className="flex items-center justify-between border-b border-ink-100 p-6 pb-4">
          <h2 className="text-lg font-semibold text-ink-900">{titulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto p-6 pt-4">{children}</div>
      </div>
    </div>
  );
}
