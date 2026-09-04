import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface BadgeProps {
  className: string;
  children: ReactNode;
}

/**
 * Rótulo genérico de estado (status de estoque, integração, plano etc.) —
 * para status de ORÇAMENTO, use sempre `StatusBadge`, não este componente.
 */
export function Badge({ className, children }: BadgeProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>
      {children}
    </span>
  );
}
