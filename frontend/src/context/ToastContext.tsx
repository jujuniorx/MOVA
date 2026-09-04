import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface ToastItem {
  id: string;
  mensagem: string;
}

interface ToastContextValor {
  mostrarSucesso: (mensagem: string) => void;
}

const ToastContext = createContext<ToastContextValor | null>(null);

const DURACAO_MS = 3200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function mostrarSucesso(mensagem: string) {
    const id = crypto.randomUUID();
    setToasts((atual) => [...atual, { id, mensagem }]);
    setTimeout(() => {
      setToasts((atual) => atual.filter((toast) => toast.id !== id));
    }, DURACAO_MS);
  }

  return (
    <ToastContext.Provider value={{ mostrarSucesso }}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl motion-safe:animate-toast-in"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-brand-400" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {toast.mensagem}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const contexto = useContext(ToastContext);
  if (!contexto) {
    throw new Error("useToast precisa ser usado dentro de um ToastProvider.");
  }
  return contexto;
}
