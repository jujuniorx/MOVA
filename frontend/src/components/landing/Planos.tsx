import { Link } from "react-router-dom";
import { Button } from "../ui/Button";

interface Plano {
  nome: string;
  descricao: string;
  preco: string;
  destaque?: boolean;
  beneficios: string[];
}

const planos: Plano[] = [
  {
    nome: "Básico",
    descricao: "Ideal para pequenos negócios",
    preco: "29,90",
    beneficios: [
      "Até 50 orçamentos por mês",
      "Envio via WhatsApp",
      "Clientes e serviços ilimitados",
      "Suporte por e-mail",
    ],
  },
  {
    nome: "Profissional",
    descricao: "Para negócios em crescimento",
    preco: "59,90",
    destaque: true,
    beneficios: [
      "Orçamentos ilimitados",
      "Personalização completa (logo e cores)",
      "Painel de acompanhamento",
      "Suporte prioritário",
    ],
  },
  {
    nome: "Empresarial",
    descricao: "Para operações maiores",
    preco: "99,90",
    beneficios: [
      "Tudo do plano Profissional",
      "Múltiplos usuários",
      "Onboarding assistido",
      "Suporte dedicado",
    ],
  },
];

export function Planos() {
  return (
    <section id="planos" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">Planos para todo tipo de negócio</h2>
        <p className="mt-3 text-ink-600">Comece grátis e evolua conforme sua empresa cresce.</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {planos.map((plano) => (
          <div
            key={plano.nome}
            className={`relative rounded-2xl border p-6 ${
              plano.destaque ? "border-brand-600 shadow-lg" : "border-ink-200"
            }`}
          >
            {plano.destaque && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                Mais popular
              </span>
            )}

            <h3 className="font-semibold text-ink-900">{plano.nome}</h3>
            <p className="mt-1 text-sm text-ink-500">{plano.descricao}</p>

            <p className="mt-4">
              <span className="text-3xl font-bold text-ink-900">R$ {plano.preco}</span>
              <span className="text-sm text-ink-500">/mês</span>
            </p>

            <ul className="mt-5 flex flex-col gap-2.5">
              {plano.beneficios.map((beneficio) => (
                <li key={beneficio} className="flex items-start gap-2 text-sm text-ink-600">
                  <svg
                    viewBox="0 0 24 24"
                    className="mt-0.5 h-4 w-4 shrink-0 text-success-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {beneficio}
                </li>
              ))}
            </ul>

            <Link to="/registrar" className="mt-6 block">
              <Button variante={plano.destaque ? "primario" : "secundario"} className="w-full">
                Começar agora
              </Button>
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-ink-400">
        Crie sua conta agora, sem custo, e comece a montar seus orçamentos.
      </p>
    </section>
  );
}
