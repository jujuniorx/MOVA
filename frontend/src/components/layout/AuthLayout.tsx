import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../Logo";

interface Beneficio {
  titulo: string;
  descricao: string;
}

const BENEFICIOS_PADRAO: Beneficio[] = [
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

interface AuthLayoutProps {
  children: ReactNode;
  /** Personaliza o painel esquerdo (usado hoje só pela tela de cadastro) — quando omitido, mantém o texto padrão do login. */
  titulo?: string;
  subtitulo?: string;
  beneficios?: Beneficio[];
  legendaMobile?: string;
}

export function AuthLayout({
  children,
  titulo = "Crie, envie e acompanhe seus orçamentos de forma simples.",
  subtitulo = "Organize clientes, produtos e orçamentos em um só lugar — e feche negócio mais rápido.",
  beneficios = BENEFICIOS_PADRAO,
  legendaMobile = "Orçamentos rápidos e profissionais",
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh bg-ink-50">
      {/*
        Painel sempre escuro, de propósito — não reage ao tema do MOVA (por
        isso as cores aqui são fixas, não os tokens de texto que invertem no
        dark mode, como ink e brand). Só o acento (brand-300) muda com o
        tema, para o resto da marca continuar coerente.
      */}
      <div className="relative hidden w-1/2 flex-col bg-[#141818] px-12 py-12 text-white lg:flex xl:px-16">
        <Link to="/" className="inline-flex">
          <Logo tom="claro" />
        </Link>

        <div className="flex flex-1 flex-col justify-center py-12">
          <h1 className="max-w-md text-3xl font-bold leading-tight">{titulo}</h1>
          <p className="mt-4 max-w-md text-white/70">{subtitulo}</p>

          <ul className="mt-10 flex max-w-md flex-col gap-6">
            {beneficios.map((beneficio) => (
              <li key={beneficio.titulo} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-brand-300">
                  <IconeCheck />
                </span>
                <div>
                  <p className="font-medium">{beneficio.titulo}</p>
                  <p className="mt-0.5 text-sm text-white/70">{beneficio.descricao}</p>
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
            <p className="mt-2 text-sm text-ink-500">{legendaMobile}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
