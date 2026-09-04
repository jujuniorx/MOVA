import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../Logo";

const BENEFICIOS = [
  {
    titulo: "Orçamentos profissionais em minutos",
    descricao: "Monte um orçamento completo com poucos cliques e envie na hora.",
  },
  {
    titulo: "Envio direto pelo WhatsApp",
    descricao: "Seu cliente recebe um link organizado, sem precisar instalar nada.",
  },
  {
    titulo: "Feito para qualquer negócio",
    descricao:
      "Você configura o que vende e o que precisa saber do cliente — sem depender de programador.",
  },
];

function IconeCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh bg-ink-50">
      <div className="relative hidden w-1/2 flex-col bg-ink-900 px-12 py-12 text-white lg:flex xl:px-16">
        <Link to="/" className="inline-flex">
          <Logo tom="claro" />
        </Link>

        <div className="flex flex-1 flex-col justify-center py-12">
          <h1 className="max-w-md text-3xl font-bold leading-tight">
            Crie, envie e acompanhe seus orçamentos de forma simples.
          </h1>
          <p className="mt-4 max-w-md text-ink-200">
            Organize clientes, produtos e orçamentos em um só lugar — e feche negócio mais rápido.
          </p>

          <ul className="mt-10 flex max-w-md flex-col gap-6">
            {BENEFICIOS.map((beneficio) => (
              <li key={beneficio.titulo} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-brand-300">
                  <IconeCheck />
                </span>
                <div>
                  <p className="font-medium">{beneficio.titulo}</p>
                  <p className="mt-0.5 text-sm text-ink-200">{beneficio.descricao}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <Link to="/" className="inline-flex">
              <Logo />
            </Link>
            <p className="mt-2 text-sm text-ink-500">Orçamentos rápidos e profissionais</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
