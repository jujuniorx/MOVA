import { Link } from "react-router-dom";
import { Button } from "../ui/Button";

export function LandingFooter() {
  return (
    <>
      <section id="sobre" className="bg-orca-900">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Pronto para organizar seus orçamentos?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-orca-100/80">
            O OrçaFácil ajuda arquitetos, eletricistas, prestadores de serviço e pequenas
            empresas a criar, enviar e acompanhar orçamentos com profissionalismo.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/registrar">
              <Button className="w-full sm:w-auto">Começar grátis agora</Button>
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

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="text-center sm:text-left">
              <span className="text-lg font-semibold tracking-tight">
                <span className="text-orca-800">Orça</span>
                <span className="text-facil-600">Fácil</span>
              </span>
              <p className="mt-1 text-sm text-slate-500">
                Orçamentos profissionais para o seu negócio.
              </p>
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600">
              <a href="#como-funciona" className="hover:text-slate-900">Como funciona</a>
              <a href="#planos" className="hover:text-slate-900">Planos</a>
              <a href="#recursos" className="hover:text-slate-900">Recursos</a>
              <Link to="/login" className="hover:text-slate-900">Entrar</Link>
            </nav>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            Cada empresa tem seus dados isolados e protegidos dentro do OrçaFácil.
          </p>
        </div>
      </footer>
    </>
  );
}
