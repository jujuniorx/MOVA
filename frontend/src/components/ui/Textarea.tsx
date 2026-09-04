import { forwardRef, useId } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface CampoTextoLongoProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  rotulo: string;
  erro?: string;
  dica?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, CampoTextoLongoProps>(function Textarea(
  { rotulo, erro, dica, id, className = "", ...props },
  ref
) {
  const idGerado = useId();
  const textareaId = id ?? idGerado;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={textareaId} className="text-sm font-medium text-ink-700">
        {rotulo}
        {props.required && <span className="text-danger-600"> *</span>}
      </label>
      <textarea
        id={textareaId}
        ref={ref}
        aria-invalid={Boolean(erro)}
        aria-describedby={erro ? `${textareaId}-erro` : undefined}
        className={cn(
          "min-h-32 w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500",
          erro ? "border-danger-600" : "border-ink-200",
          className
        )}
        {...props}
      />
      {dica && !erro && <p className="text-xs text-ink-500">{dica}</p>}
      {erro && (
        <p id={`${textareaId}-erro`} className="text-sm text-danger-600">
          {erro}
        </p>
      )}
    </div>
  );
});
