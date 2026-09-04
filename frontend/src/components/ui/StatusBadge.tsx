type Status = "RASCUNHO" | "ENVIADO" | "APROVADO" | "RECUSADO";

const configuracao: Record<Status, { rotulo: string; className: string }> = {
  RASCUNHO: { rotulo: "Rascunho", className: "bg-ink-100 text-ink-700" },
  ENVIADO: { rotulo: "Enviado", className: "bg-brand-100 text-brand-700" },
  APROVADO: { rotulo: "Aprovado", className: "bg-success-100 text-success-700" },
  RECUSADO: { rotulo: "Recusado", className: "bg-danger-100 text-danger-700" },
};

export function StatusBadge({ status }: { status: Status }) {
  const { rotulo, className } = configuracao[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium motion-safe:animate-fade-in ${className}`}
    >
      {rotulo}
    </span>
  );
}
