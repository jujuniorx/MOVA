import type { ReactNode } from "react";

type Tipo = "erro" | "sucesso" | "aviso";

const classesPorTipo: Record<Tipo, string> = {
  erro: "bg-danger-50 text-danger-700",
  sucesso: "bg-success-50 text-success-700",
  aviso: "bg-warning-50 text-warning-700",
};

export function Alert({ tipo = "erro", children }: { tipo?: Tipo; children: ReactNode }) {
  return (
    <div
      role="alert"
      className={`rounded-lg px-4 py-3 text-sm font-medium motion-safe:animate-fade-in ${classesPorTipo[tipo]}`}
    >
      {children}
    </div>
  );
}
