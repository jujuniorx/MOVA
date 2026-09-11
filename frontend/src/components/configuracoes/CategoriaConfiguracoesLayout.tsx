import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { ConfiguracoesNav } from "./ConfiguracoesNav";

interface CategoriaConfiguracoesLayoutProps {
  titulo: string;
  descricao: string;
  children: ReactNode;
}

/** Casca comum de toda página de categoria dentro de Configurações: link de
 * volta, navegação entre categorias e título/descrição da área atual. */
export function CategoriaConfiguracoesLayout({ titulo, descricao, children }: CategoriaConfiguracoesLayoutProps) {
  return (
    <AppLayout>
      <Link
        to="/configuracoes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-700"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
        Configurações
      </Link>

      <div className="mt-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">{titulo}</h1>
        <p className="mt-1 text-sm text-ink-500">{descricao}</p>
      </div>

      <div className="mt-5">
        <ConfiguracoesNav />
      </div>

      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </AppLayout>
  );
}
