import { cn } from "../../lib/cn";

/** Bloco de carregamento — reutilizado no lugar de cards cinza duplicados. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-ink-100", className)} aria-hidden="true" />;
}
