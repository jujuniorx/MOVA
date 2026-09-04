import { Navigate, Link } from "react-router-dom";
import { PublicNav } from "../components/landing/PublicNav";
import { ProductPreview } from "../components/landing/ProductPreview";
import { OrcamentoSimulador } from "../components/landing/OrcamentoSimulador";
import { ComoFunciona } from "../components/landing/ComoFunciona";
import { Beneficios } from "../components/landing/Beneficios";
import { Planos } from "../components/landing/Planos";
import { LandingFooter } from "../components/landing/LandingFooter";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

const beneficiosRapidos = [
  "Crie orçamentos personalizados em minutos",
  "Envie para seus clientes pelo WhatsApp",
  "Acompanhe tudo em um só lugar",
];

const segmentos = [
  "Arquitetos",
  "Eletricistas",
  "Encanadores",
  "Marceneiros",
  "Limpeza",
  "Manutenção",
  "Eventos",
  "Autônomos",
];

export function LandingPage() {
  const { usuario, carregando } = useAuth();

  if (!carregando && usuario) {
    return <Navigate to="/painel" replace />;
  }

  return (
    <div id="inicio" className="overflow-x-hidden bg-white">
      <PublicNav />

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              Orçamentos profissionais para o seu negócio
            </span>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              Orçamentos rápidos.
              <br />
              Negócios que <span className="text-brand-600">crescem.</span>
            </h1>

            <p className="mt-5 max-w-lg text-lg text-ink-600">
              Crie orçamentos profissionais em minutos, envie para seus clientes pelo WhatsApp e
              acompanhe tudo em um só lugar — sem planilhas, sem complicação.
            </p>

            <ul className="mt-6 flex flex-col gap-2.5">
              {beneficiosRapidos.map((item) => (
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
                <Button className="w-full sm:w-auto">Começar grátis agora</Button>
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

        <div className="mt-10 border-t border-ink-100 pt-8">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-ink-400">
            Feito para diferentes tipos de negócio
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {segmentos.map((segmento) => (
              <span key={segmento} className="text-sm text-ink-500">
                {segmento}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink-50 py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-md text-center lg:text-left">
            <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">
              Configure suas próprias regras de orçamento
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
      <Beneficios />
      <Planos />
      <LandingFooter />
    </div>
  );
}
