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
 * Símbolo MOVA: duas hastes ascendentes formando um "M" em movimento.
 * Sem gradiente, sem brilho — apenas forma.
 */
export function LogoSimbolo({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-900",
        className
      )}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
        <path
          d="M4 17.5V9.5L9.5 15L14.5 7"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.5 7L20 13V17.5"
          stroke="var(--color-brand-400)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
