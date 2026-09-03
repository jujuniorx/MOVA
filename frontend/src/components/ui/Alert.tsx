import type { ReactNode } from "react";

type Tipo = "erro" | "sucesso";

const classesPorTipo: Record<Tipo, string> = {
  erro: "bg-danger-100 text-danger-600",
  sucesso: "bg-success-100 text-success-600",
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
