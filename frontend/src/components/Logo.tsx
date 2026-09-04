import { cn } from "../lib/cn";

type Tom = "claro" | "escuro";

interface LogoProps {
  /** "escuro" = wordmark escuro para fundos claros. "claro" = wordmark branco. */
  tom?: Tom;
  /** Esconde o wordmark e mostra apenas o símbolo. */
  apenasSimbolo?: boolean;
  className?: string;
}

/**
 * Símbolo MOVA: um M geométrico e simétrico, em dois tons — a metade
 * esquerda e a metade direita "se encontram" no vértice central, como duas
 * correntes que se conectam (clientes + operação, ou entrada + saída de um
 * fluxo). O selo (fundo + traço principal) é fixo e não inverte com o
 * tema — só o traço de destaque troca de cor (teal no claro, laranja no
 * escuro), a mesma variável usada em todo o resto da marca.
 */
export function LogoSimbolo({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", className)}
      style={{ backgroundColor: "#141818" }}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
        <path d="M5 17V7L12 15" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 15L19 7V17" stroke="var(--color-brand-400)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Logo({ tom = "escuro", apenasSimbolo = false, className = "" }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} aria-label="MOVA">
      <LogoSimbolo />
      {!apenasSimbolo && (
        <span
          className={cn(
            "text-lg font-extrabold tracking-[0.1em]",
            tom === "claro" ? "text-white" : "text-ink-900"
          )}
        >
          MOVA
        </span>
      )}
    </span>
  );
}
