import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variante = "primario" | "secundario" | "perigo" | "sucesso" | "whatsapp" | "discreto";
type Tamanho = "sm" | "md" | "lg";

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
  carregando?: boolean;
  children: ReactNode;
}

const classesPorVariante: Record<Variante, string> = {
  primario: "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-800 shadow-[var(--shadow-card)]",
  secundario: "bg-white text-ink-800 border border-ink-200 hover:bg-ink-50 hover:border-ink-300",
  perigo: "bg-danger-600 text-white hover:bg-danger-700",
  sucesso: "bg-success-600 text-white hover:bg-success-700",
  whatsapp: "bg-[#128C4A] text-white hover:bg-[#0f7a40]",
  discreto: "bg-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900",
};

const classesPorTamanho: Record<Tamanho, string> = {
  sm: "min-h-9 px-3 text-sm gap-1.5",
  md: "min-h-11 px-4 text-sm gap-2",
  lg: "min-h-12 px-5 text-base gap-2",
};

export function Button({
  variante = "primario",
  tamanho = "md",
  carregando = false,
  disabled,
  className = "",
  children,
  ...props
}: BotaoProps) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-semibold",
        "transition-[background-color,border-color,color,box-shadow] duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        "disabled:cursor-not-allowed disabled:opacity-50",
        classesPorTamanho[tamanho],
        classesPorVariante[variante],
        className
      )}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...props}
    >
      {carregando && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
