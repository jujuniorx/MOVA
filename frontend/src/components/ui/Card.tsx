import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-ink-200 bg-white p-6 shadow-[var(--shadow-card)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  titulo: ReactNode;
  descricao?: ReactNode;
  acao?: ReactNode;
  className?: string;
}

/** Cabeçalho padrão de seção dentro de um Card: título + descrição opcional + ação à direita. */
export function CardHeader({ titulo, descricao, acao, className = "" }: CardHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div>
        <h2 className="text-base font-semibold text-ink-900">{titulo}</h2>
        {descricao && <p className="mt-1 text-sm text-ink-500">{descricao}</p>}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  );
}
