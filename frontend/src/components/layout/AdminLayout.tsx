import type { ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "../Logo";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { cn } from "../../lib/cn";

const itensNav = [
  { rotulo: "Empresas", caminho: "/admin" },
  { rotulo: "Auditoria", caminho: "/admin/auditoria" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { admin, sair } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();

  function ativo(caminho: string) {
    return location.pathname === caminho;
  }

  function aoSair() {
    sair();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="min-h-svh bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-surface/95 backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="inline-flex rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
              <Logo />
            </Link>
            <span className="hidden rounded-full bg-ink-900 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white sm:inline-block">
              Administração
            </span>
          </div>

          <nav className="flex items-center gap-1">
            {itensNav.map((item) => (
              <NavLink
                key={item.caminho}
                to={item.caminho}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  ativo(item.caminho) ? "bg-brand-50 text-brand-800" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                )}
              >
                {item.rotulo}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-500 sm:inline">{admin?.nome}</span>
            <ThemeToggle />
            <button
              type="button"
              onClick={aoSair}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div key={location.pathname} className="motion-safe:animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
