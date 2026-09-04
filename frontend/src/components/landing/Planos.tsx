import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { planosApi } from "../../lib/api";
import type { PlanoConfig, PlanoTipo } from "../../lib/api";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const NOMES_PLANO: Record<PlanoTipo, string> = {
  GRATUITO: "Gratuito",
  START: "MOVA Start",
  BUSINESS: "MOVA Business",
  PRO: "MOVA Pro",
};

const DESCRICOES_PLANO: Record<PlanoTipo, string> = {
  GRATUITO: "Para experimentar o MOVA sem compromisso.",
  START: "O plano de entrada para organizar seu negócio.",
  BUSINESS: "Para operações comerciais mais estruturadas.",
  PRO: "Para centralizar toda a operação comercial.",
};

export function Planos() {
  const [planos, setPlanos] = useState<PlanoConfig[]>([]);

  useEffect(() => {
    planosApi.listar().then(setPlanos).catch(() => {});
  }, []);

  const planosPagos = planos.filter((plano) => plano.planoTipo !== "GRATUITO");

  return (
    <section id="planos" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">Planos para todo tipo de negócio</h2>
        <p className="mt-3 text-ink-600">Comece grátis e evolua conforme sua empresa cresce.</p>
      </div>

      {planosPagos.length > 0 && (
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {planosPagos.map((plano) => {
            const destaque = plano.planoTipo === "BUSINESS";
            const beneficios = [
              plano.limiteClientes === null ? "Clientes ilimitados" : `Até ${plano.limiteClientes} clientes`,
              plano.limiteProdutos === null ? "Produtos ilimitados" : `Até ${plano.limiteProdutos} produtos/serviços`,
              plano.limiteOrcamentos === null
                ? "Orçamentos ilimitados"
                : `${plano.limiteOrcamentos} orçamentos${plano.limiteOrcamentosMensal ? "/mês" : ""}`,
              plano.recursos.estoqueCompleto && "Estoque completo",
              plano.recursos.automacoes && "Automações",
              plano.recursos.iaCompleta ? "IA completa" : plano.recursos.iaLimitada && "IA (recursos limitados)",
              plano.recursos.mercadoLivre && "Integração com Mercado Livre",
            ].filter((item): item is string => Boolean(item));

            return (
              <div
                key={plano.planoTipo}
                className={`relative rounded-2xl border p-6 ${destaque ? "border-brand-600 shadow-lg" : "border-ink-200"}`}
              >
                {destaque && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                    Mais popular
                  </span>
                )}

                <h3 className="font-semibold text-ink-900">{NOMES_PLANO[plano.planoTipo]}</h3>
                <p className="mt-1 text-sm text-ink-500">{DESCRICOES_PLANO[plano.planoTipo]}</p>

                <p className="mt-4">
                  <span className="text-3xl font-bold text-ink-900">{formatoMoeda.format(Number(plano.precoMensal))}</span>
                  <span className="text-sm text-ink-500">/mês</span>
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  ou {formatoMoeda.format(Number(plano.precoAnual))}/ano — economize o equivalente a 2 meses
                </p>

                <ul className="mt-5 flex flex-col gap-2.5">
                  {beneficios.map((beneficio) => (
                    <li key={beneficio} className="flex items-start gap-2 text-sm text-ink-600">
                      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-success-600" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {beneficio}
                    </li>
                  ))}
                </ul>

                <Link to="/registrar" className="mt-6 block">
                  <Button variante={destaque ? "primario" : "secundario"} className="w-full">
                    Começar agora
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-ink-400">
        Crie sua conta agora, sem custo, e comece a organizar sua operação.
      </p>
    </section>
  );
}
