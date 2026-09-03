type Status = "RASCUNHO" | "ENVIADO" | "APROVADO" | "RECUSADO";

const configuracao: Record<Status, { rotulo: string; className: string }> = {
  RASCUNHO: { rotulo: "Rascunho", className: "bg-slate-100 text-slate-700" },
  ENVIADO: { rotulo: "Enviado", className: "bg-facil-100 text-facil-700" },
  APROVADO: { rotulo: "Aprovado", className: "bg-success-100 text-success-600" },
  RECUSADO: { rotulo: "Recusado", className: "bg-danger-100 text-danger-600" },
};

export function StatusBadge({ status }: { status: Status }) {
  const { rotulo, className } = configuracao[status];
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {rotulo}
    </span>
  );
}
