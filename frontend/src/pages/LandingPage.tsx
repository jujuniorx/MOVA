import { Navigate, Link } from "react-router-dom";
import { PublicNav } from "../components/landing/PublicNav";
import { ProductPreview } from "../components/landing/ProductPreview";
import { OrcamentoSimulador } from "../components/landing/OrcamentoSimulador";
import { OQueEoMova } from "../components/landing/OQueEoMova";
import { EcossistemaMova } from "../components/landing/EcossistemaMova";
import { VisaoMulticanal } from "../components/landing/VisaoMulticanal";
import { TiposDeNegocio } from "../components/landing/TiposDeNegocio";
import { Filosofia } from "../components/landing/Filosofia";
import { ComoFunciona } from "../components/landing/ComoFunciona";
import { Beneficios } from "../components/landing/Beneficios";
import { Vantagens } from "../components/landing/Vantagens";
import { Planos } from "../components/landing/Planos";
import { LandingFooter } from "../components/landing/LandingFooter";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

const capacidadesRapidas = [
  "Clientes, produtos e orçamentos organizados num só lugar",
  "Envie pelo WhatsApp e acompanhe o histórico",
  "Configure sua operação do seu próprio jeito",
];

export function LandingPage() {
  const { usuario, carregando } = useAuth();

  if (!carregando && usuario) {
    return <Navigate to="/painel" replace />;
  }

  return (
    <div id="inicio" className="overflow-x-hidden bg-surface">
      <PublicNav />

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              Plataforma de operação comercial
            </span>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              Seu negócio inteiro <span className="text-brand-600">em movimento.</span>
            </h1>

            <p className="mt-5 max-w-lg text-lg text-ink-600">
              Você vende em vários lugares. O MOVA organiza tudo em um só: clientes, produtos,
              orçamentos e o começo da sua venda — com WhatsApp e novos canais entrando conforme o
              produto evolui.
            </p>

            <ul className="mt-6 flex flex-col gap-2.5">
              {capacidadesRapidas.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-ink-700">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 shrink-0 text-brand-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/registrar">
                <Button className="w-full sm:w-auto">Conhecer o MOVA</Button>
              </Link>
              <a href="#como-funciona">
                <Button variante="secundario" className="w-full sm:w-auto">
                  Ver como funciona
                </Button>
              </a>
            </div>
          </div>

          <div className="hidden justify-self-end pr-6 lg:flex">
            <ProductPreview />
          </div>
        </div>

        <div className="mt-12 flex justify-center lg:hidden">
          <ProductPreview />
        </div>
      </section>

      <OQueEoMova />
      <EcossistemaMova />
      <Beneficios />
      <TiposDeNegocio />
      <Filosofia />

      <section className="py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-md text-center lg:text-left">
            <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">
              Orçamento é só uma parte — e ele já é automático
            </h2>
            <p className="mt-3 text-ink-600">
              No MOVA, cada empresa cadastra seus serviços e preços — o cálculo do orçamento é
              sempre feito automaticamente, sem erro de conta.
            </p>
          </div>
          <OrcamentoSimulador />
        </div>
      </section>

      <ComoFunciona />
      <VisaoMulticanal />
      <Vantagens />
      <Planos />
      <LandingFooter />
    </div>
  );
}
