import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

interface CampoTextoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
  erro?: string;
  dica?: string;
  /** Elemento opcional sobreposto do lado direito do campo (ex.: botão de mostrar/ocultar senha) — o input ganha espaço automaticamente. */
  direita?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, CampoTextoProps>(function Input(
  { rotulo, erro, dica, direita, id, className = "", ...props },
  ref
) {
  const idGerado = useId();
  const inputId = id ?? idGerado;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink-700">
        {rotulo}
        {props.required && <span className="text-danger-600"> *</span>}
      </label>
      <div className="relative">
        <input
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? `${inputId}-erro` : undefined}
          className={cn(
            "min-h-11 w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500",
            erro ? "border-danger-600" : "border-ink-200",
            direita ? "pr-10" : "",
            className
          )}
          {...props}
        />
        {direita && <div className="absolute inset-y-0 right-0 flex items-center pr-1">{direita}</div>}
      </div>
      {dica && !erro && <p className="text-xs text-ink-500">{dica}</p>}
      {erro && (
        <p id={`${inputId}-erro`} className="text-sm text-danger-600">
          {erro}
        </p>
      )}
    </div>
  );
});
