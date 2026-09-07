import { useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "../Logo";
import { ThemeToggle } from "../ui/ThemeToggle";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { cn } from "../../lib/cn";

const itensNav = [
  { rotulo: "Início", caminho: "/admin" },
  { rotulo: "Empresas", caminho: "/admin/empresas" },
  { rotulo: "Usuários", caminho: "/admin/usuarios" },
  { rotulo: "Planos", caminho: "/admin/planos" },
  { rotulo: "Assinaturas", caminho: "/admin/assinaturas" },
  { rotulo: "Acessos especiais", caminho: "/admin/acessos-especiais" },
  { rotulo: "Problemas", caminho: "/admin/problemas" },
  { rotulo: "Integrações", caminho: "/admin/integracoes" },
  { rotulo: "Métricas", caminho: "/admin/metricas" },
  { rotulo: "Funcionalidades experimentais", caminho: "/admin/funcionalidades-experimentais" },
  { rotulo: "Saúde", caminho: "/admin/saude" },
  { rotulo: "Segurança", caminho: "/admin/seguranca" },
  { rotulo: "Auditoria", caminho: "/admin/auditoria" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { admin, sair } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

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
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center justify-between gap-4 sm:justify-start">
            <div className="flex items-center gap-3">
              <Link to="/admin" className="inline-flex rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                <Logo />
              </Link>
              <span className="rounded-full bg-[#141818] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                Administração
              </span>
            </div>

            <div className="flex items-center gap-3 sm:hidden">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setConfirmandoSaida(true)}
                className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
              >
                Sair
              </button>
            </div>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {itensNav.map((item) => (
              <NavLink
                key={item.caminho}
                to={item.caminho}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  ativo(item.caminho) ? "bg-brand-50 text-brand-800" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                )}
              >
                {item.rotulo}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <span className="text-sm text-ink-500">{admin?.nome}</span>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setConfirmandoSaida(true)}
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

      <ConfirmDialog
        titulo="Sair do MOVA"
        mensagem="Tem certeza que deseja sair do MOVA?"
        aberto={confirmandoSaida}
        rotuloConfirmar="Sair"
        varianteConfirmar="perigo"
        aoConfirmar={aoSair}
        aoCancelar={() => setConfirmandoSaida(false)}
      />
    </div>
  );
}
