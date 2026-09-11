import { NavLink } from "react-router-dom";
import { cn } from "../../lib/cn";

export const CATEGORIAS_CONFIGURACOES = [
  { caminho: "/configuracoes/empresa", rotulo: "Minha empresa" },
  { caminho: "/configuracoes/marca", rotulo: "Minha marca e meu site" },
  { caminho: "/configuracoes/negocio", rotulo: "Como meu negócio funciona" },
  { caminho: "/configuracoes/recursos", rotulo: "Recursos do MOVA" },
  { caminho: "/configuracoes/orcamentos", rotulo: "Orçamentos" },
  { caminho: "/configuracoes/ia", rotulo: "Inteligência do MOVA" },
  { caminho: "/configuracoes/integracoes", rotulo: "Integrações" },
  { caminho: "/configuracoes/plano", rotulo: "Plano e indicações" },
  { caminho: "/configuracoes/ajuda", rotulo: "Ajuda" },
] as const;

/**
 * Navegação entre as categorias de Configurações — mesma em todas as
 * páginas de categoria, pra nunca obrigar a pessoa a voltar pra visão geral
 * só pra ir de uma área pra outra. Mesmo padrão de pill já usado em
 * Orçamentos/Indicações (mas aqui são links de rota, não filtros).
 */
export function ConfiguracoesNav() {
  return (
    <nav aria-label="Categorias de configurações" className="flex flex-wrap gap-2">
      {CATEGORIAS_CONFIGURACOES.map((categoria) => (
        <NavLink
          key={categoria.caminho}
          to={categoria.caminho}
          className={({ isActive }) =>
            cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
              isActive
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 bg-surface text-ink-600 hover:bg-ink-50"
            )
          }
        >
          {categoria.rotulo}
        </NavLink>
      ))}
    </nav>
  );
}
