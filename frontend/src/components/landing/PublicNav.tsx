import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { ThemeToggle } from "../ui/ThemeToggle";
import { Logo } from "../Logo";

const links = [
  { rotulo: "Início", href: "#inicio" },
  { rotulo: "Como funciona", href: "#como-funciona" },
  { rotulo: "Planos", href: "#planos" },
  { rotulo: "Recursos", href: "#recursos" },
  { rotulo: "Sobre", href: "#sobre" },
];

export function PublicNav() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <a href="#inicio" className="inline-flex">
          <Logo />
        </a>

        <nav className="hidden items-center gap-7 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink-600 hover:text-ink-900"
            >
              {link.rotulo}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          <Link to="/login" className="text-sm font-medium text-ink-600 hover:text-ink-900">
            Entrar
          </Link>
          <Link to="/registrar">
            <Button>Começar grátis</Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="rounded-lg border border-ink-200 p-2 text-ink-700"
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((aberto) => !aberto)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {menuAberto && (
        <div className="border-t border-ink-200 px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-4">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-ink-700"
                onClick={() => setMenuAberto(false)}
              >
                {link.rotulo}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-ink-100 pt-4">
            <Link to="/login" onClick={() => setMenuAberto(false)}>
              <Button variante="secundario" className="w-full">
                Entrar
              </Button>
            </Link>
            <Link to="/registrar" onClick={() => setMenuAberto(false)}>
              <Button className="w-full">Começar grátis</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
