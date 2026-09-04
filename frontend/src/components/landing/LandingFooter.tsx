import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { Logo } from "../Logo";

export function LandingFooter() {
  return (
    <>
      <section id="sobre" className="bg-ink-900">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Comece a organizar sua empresa
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-200">
            O MOVA centraliza clientes, produtos, orçamentos e o começo da sua operação comercial —
            para lojas, oficinas, prestadores de serviço e empresas que vendem pelo WhatsApp.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/registrar">
              <Button className="w-full sm:w-auto">Conhecer o MOVA</Button>
            </Link>
            <a href="#como-funciona">
              <Button
                variante="secundario"
                className="w-full border-white/30 bg-transparent text-white hover:bg-white/10 sm:w-auto"
              >
                Ver como funciona
              </Button>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-200 bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
              <Logo />
              <p className="mt-1 text-sm text-ink-500">A plataforma para organizar a operação comercial do seu negócio.</p>
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-600">
              <a href="#como-funciona" className="hover:text-ink-900">Como funciona</a>
              <a href="#planos" className="hover:text-ink-900">Planos</a>
              <a href="#recursos" className="hover:text-ink-900">Recursos</a>
              <Link to="/login" className="hover:text-ink-900">Entrar</Link>
            </nav>
          </div>

          <p className="mt-8 text-center text-xs text-ink-400">
            Cada empresa tem seus dados isolados e protegidos dentro do MOVA.
          </p>
        </div>
      </footer>
    </>
  );
}
