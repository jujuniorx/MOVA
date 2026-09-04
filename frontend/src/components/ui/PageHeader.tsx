import type { ReactNode } from "react";

interface PageHeaderProps {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  acao?: ReactNode;
}

/** Cabeçalho padrão de página autenticada: título + subtítulo + ação principal. */
export function PageHeader({ titulo, subtitulo, acao }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-ink-500">{subtitulo}</p>}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  );
}
