import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../Logo";

// Mantidos só pela assinatura pública do componente (Cadastro ainda passa
// esses props) — a composição atual não usa mais um painel de benefícios
// separado, então eles não são lidos aqui. Ver AuthLayoutProps abaixo.
interface Beneficio {
  titulo: string;
  descricao: string;
}

interface AuthLayoutProps {
  children: ReactNode;
  titulo?: string;
  subtitulo?: string;
  beneficios?: Beneficio[];
  /** Frase curta exibida sob a logo — mesma linguagem da Landing, sem virar um slogan de seção. */
  legendaMobile?: string;
}

/**
 * Casca visual das telas de autenticação (Login, Cadastro, Recuperação de
 * senha) — um único canvas claro e centralizado, na mesma linguagem da
 * Landing (fundo ink-50/superfície, logo oficial, acento verde-petróleo),
 * em vez do antigo painel escuro dividido, que lia como um template
 * genérico de SaaS e não conversava com o resto do produto.
 */
export function AuthLayout({ children, legendaMobile = "Sua operação comercial em um só lugar" }: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-ink-50">
      <header className="border-b border-ink-200 bg-surface">
        <div className="mx-auto flex max-w-6xl px-4 py-3.5 sm:px-6">
          <Link
            to="/"
            className="inline-flex rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Logo />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-sm">
          <p className="mb-6 text-center text-sm text-ink-500">{legendaMobile}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
