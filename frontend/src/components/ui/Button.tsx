import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variante = "primario" | "secundario" | "perigo" | "sucesso" | "whatsapp";

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  carregando?: boolean;
  children: ReactNode;
}

const classesPorVariante: Record<Variante, string> = {
  primario: "bg-facil-600 text-white hover:bg-facil-700 focus-visible:outline-facil-600",
  secundario:
    "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:outline-facil-600",
  perigo: "bg-danger-600 text-white hover:bg-red-700 focus-visible:outline-danger-600",
  sucesso: "bg-success-600 text-white hover:bg-green-700 focus-visible:outline-success-600",
  whatsapp: "bg-[#25D366] text-white hover:bg-[#1fbd5a] focus-visible:outline-[#25D366]",
};

export function Button({
  variante = "primario",
  carregando = false,
  disabled,
  className = "",
  children,
  ...props
}: BotaoProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors motion-safe:active:scale-[0.98] motion-safe:transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        classesPorVariante[variante],
        className
      )}
      disabled={disabled || carregando}
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
