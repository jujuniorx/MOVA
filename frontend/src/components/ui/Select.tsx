import { forwardRef, useId } from "react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface CampoSelecaoProps extends SelectHTMLAttributes<HTMLSelectElement> {
  rotulo?: string;
  erro?: string;
  dica?: string;
}

export const Select = forwardRef<HTMLSelectElement, CampoSelecaoProps>(function Select(
  { rotulo, erro, dica, id, className = "", children, ...props },
  ref
) {
  const idGerado = useId();
  const selectId = id ?? idGerado;

  return (
    <div className="flex flex-col gap-1.5">
      {rotulo && (
        <label htmlFor={selectId} className="text-sm font-medium text-ink-700">
          {rotulo}
          {props.required && <span className="text-danger-600"> *</span>}
        </label>
      )}
      <select
        id={selectId}
        ref={ref}
        aria-invalid={Boolean(erro)}
        aria-describedby={erro ? `${selectId}-erro` : undefined}
        className={cn(
          "min-h-11 w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500",
          erro ? "border-danger-600" : "border-ink-200",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {dica && !erro && <p className="text-xs text-ink-500">{dica}</p>}
      {erro && (
        <p id={`${selectId}-erro`} className="text-sm text-danger-600">
          {erro}
        </p>
      )}
    </div>
  );
});
