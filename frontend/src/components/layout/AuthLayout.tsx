import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../Logo";

interface Beneficio {
  titulo: string;
  descricao: string;
}

const BENEFICIOS_PADRAO: Beneficio[] = [
  {
    titulo: "O que precisa da sua atenção, primeiro",
    descricao: "O MOVA analisa sua operação e mostra só o que realmente importa agora.",
  },
  {
    titulo: "Do orçamento à venda, sem retrabalho",
    descricao: "Aprove um orçamento e ele vira venda, com o estoque atualizado automaticamente.",
  },
  {
    titulo: "Feito para o seu tipo de negócio",
    descricao: "Você configura o que vende — produto, serviço ou os dois — e o MOVA se adapta.",
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
  titulo = "Sua operação, sempre à mão.",
  subtitulo = "Clientes, produtos, orçamentos e vendas organizados em um só lugar — do jeito que faz sentido para o seu negócio.",
  beneficios = BENEFICIOS_PADRAO,
  legendaMobile = "Sua operação comercial em um só lugar",
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh bg-ink-50">
      {/*
        Painel sempre escuro, de propósito — não reage ao tema do MOVA (por
        isso as cores aqui são fixas, não os tokens de texto que invertem no
        dark mode, como ink e brand). Só o acento (brand-300) muda com o
        tema, para o resto da marca continuar coerente.

        Aparece a partir de md (tablet em paisagem) para cima — abaixo disso
        a coluna ficaria estreita demais para o texto institucional, então a
        composição vira uma única coluna centralizada (ver painel abaixo).
      */}
      <div className="relative hidden w-1/2 flex-col bg-[#141818] px-8 py-8 text-white md:flex md:px-10 md:py-10 lg:px-12 lg:py-12 xl:px-16">
        <Link to="/" className="inline-flex">
          <Logo tom="claro" />
        </Link>

        <div className="flex flex-1 flex-col justify-center py-8 lg:py-12">
          <h1 className="max-w-md text-2xl font-bold leading-tight lg:text-3xl">{titulo}</h1>
          <p className="mt-4 max-w-md text-white/70">{subtitulo}</p>

          <ul className="mt-8 flex max-w-md flex-col gap-5 lg:mt-10 lg:gap-6">
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

      <div className="flex w-full flex-col items-center justify-center px-4 py-10 sm:py-12 md:w-1/2 md:px-6 lg:px-10">
        <div className="w-full max-w-sm lg:max-w-md xl:max-w-lg">
          <div className="mb-8 flex flex-col items-center text-center md:hidden">
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
