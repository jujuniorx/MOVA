import { useState } from "react";
import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const itensNav = [
  { rotulo: "Início", caminho: "/painel" },
  { rotulo: "Clientes", caminho: "/clientes" },
  { rotulo: "Produtos", caminho: "/produtos" },
  { rotulo: "Configurações", caminho: "/configuracoes" },
];

function classeNav(ativo: boolean) {
  return `border-b-2 pb-1 text-sm font-medium transition-colors ${
    ativo
      ? "border-facil-600 text-facil-600"
      : "border-transparent text-slate-600 hover:text-slate-900"
  }`;
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { usuario, empresa, sair } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-svh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-8">
            <Link to="/painel" className="text-lg font-semibold tracking-tight">
              <span className="text-orca-800">Orça</span>
              <span className="text-facil-600">Fácil</span>
            </Link>

            <nav className="hidden items-center gap-6 lg:flex">
              {itensNav.map((item) => (
                <NavLink
                  key={item.caminho}
                  to={item.caminho}
                  end
                  className={({ isActive }) => classeNav(isActive)}
                >
                  {item.rotulo}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-4 lg:flex">
            <div className="max-w-[160px] text-right">
              <p className="truncate text-sm font-medium text-slate-900">{empresa?.nome}</p>
              <p className="truncate text-xs text-slate-500">{usuario?.nome}</p>
            </div>
            <button
              type="button"
              onClick={sair}
              className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sair
            </button>
          </div>

          <button
            type="button"
            className="lg:hidden rounded-lg border border-slate-300 p-2.5 text-slate-700"
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((aberto) => !aberto)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {menuAberto && (
          <div className="border-t border-slate-200 px-4 py-3 lg:hidden">
            <nav className="flex flex-col gap-3">
              {itensNav.map((item) => (
                <NavLink
                  key={item.caminho}
                  to={item.caminho}
                  end
                  className={({ isActive }) => classeNav(isActive)}
                  onClick={() => setMenuAberto(false)}
                >
                  {item.rotulo}
                </NavLink>
              ))}
            </nav>
            <p className="mt-4 text-sm font-medium text-slate-900">{empresa?.nome}</p>
            <p className="text-xs text-slate-500">{usuario?.nome}</p>
            <button
              type="button"
              onClick={sair}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sair
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div key={location.pathname} className="motion-safe:animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
