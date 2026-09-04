import type { ReactNode } from "react";
import { Card } from "./Card";

interface EmptyStateProps {
  icone?: ReactNode;
  titulo: ReactNode;
  descricao?: ReactNode;
  acao?: ReactNode;
  className?: string;
}

/** Estado vazio educativo: explica o que falta e aponta o próximo passo. */
export function EmptyState({ icone, titulo, descricao, acao, className = "" }: EmptyStateProps) {
  return (
    <Card className={`flex flex-col items-center gap-3 py-10 text-center ${className}`}>
      {icone && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-400">
          {icone}
        </span>
      )}
      <p className="text-sm font-medium text-ink-700">{titulo}</p>
      {descricao && <p className="max-w-sm text-sm text-ink-500">{descricao}</p>}
      {acao && <div className="mt-1">{acao}</div>}
    </Card>
  );
}
