import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="text-2xl font-semibold tracking-tight">
            <span className="text-orca-800">Orça</span>
            <span className="text-facil-600">Fácil</span>
          </Link>
          <p className="mt-1 text-sm text-slate-500">Orçamentos rápidos e profissionais</p>
        </div>
        {children}
      </div>
    </div>
  );
}
