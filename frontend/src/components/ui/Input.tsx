import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface CampoTextoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
  erro?: string;
}

export const Input = forwardRef<HTMLInputElement, CampoTextoProps>(function Input(
  { rotulo, erro, id, className = "", ...props },
  ref
) {
  const idGerado = useId();
  const inputId = id ?? idGerado;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
        {rotulo}
        {props.required && <span className="text-danger-600"> *</span>}
      </label>
      <input
        id={inputId}
        ref={ref}
        aria-invalid={Boolean(erro)}
        aria-describedby={erro ? `${inputId}-erro` : undefined}
        className={cn(
          "rounded-lg border px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-facil-500 focus:border-facil-500",
          erro ? "border-danger-600" : "border-slate-300",
          className
        )}
        {...props}
      />
      {erro && (
        <p id={`${inputId}-erro`} className="text-sm text-danger-600">
          {erro}
        </p>
      )}
    </div>
  );
});
