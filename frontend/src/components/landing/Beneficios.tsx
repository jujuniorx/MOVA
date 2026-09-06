type Status = "disponivel" | "evolucao" | "planejado";

const SELO_POR_STATUS: Record<Status, { texto: string; classe: string }> = {
  disponivel: { texto: "Disponível", classe: "bg-success-100 text-success-700" },
  evolucao: { texto: "Em evolução", classe: "bg-warning-100 text-warning-700" },
  planejado: { texto: "Planejado", classe: "bg-ink-100 text-ink-600" },
};

const recursos: { titulo: string; descricao: string; status: Status; icone: React.ReactNode }[] = [
  {
    titulo: "Clientes",
    descricao: "Organize seus clientes e mantenha o histórico da relação comercial.",
    status: "disponivel",
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-4a4 4 0 100-8 4 4 0 000 8zm6 4a4 4 0 00-3-3.87m-8 3.87a4 4 0 013-3.87" />
    ),
  },
  {
    titulo: "Produtos e serviços",
    descricao: "Cadastre o que sua empresa vende e configure sua própria operação.",
    status: "disponivel",
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    ),
  },
  {
    titulo: "Orçamentos",
    descricao: "Crie e envie orçamentos de forma organizada, com cálculo automático.",
    status: "disponivel",
    icone: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />,
  },
  {
    titulo: "Pedidos e vendas",
    descricao: "Organize pedidos recebidos, registre vendas concluídas e acompanhe devoluções.",
    status: "disponivel",
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    ),
  },
  {
    titulo: "Estoque",
    descricao: "Controle produtos, entradas, saídas e estoque mínimo por local.",
    status: "disponivel",
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v2H4V6zm0 5h16v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7z" />
    ),
  },
  {
    titulo: "Orçamento público",
    descricao: "Seu cliente recebe um link, revisa e aprova ou recusa o orçamento sem precisar de WhatsApp.",
    status: "disponivel",
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    ),
  },
  {
    titulo: "WhatsApp",
    descricao: "Conecte a comunicação comercial ao restante da sua operação.",
    status: "disponivel",
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.97-4.03 9-9 9a8.96 8.96 0 01-4.29-1.09L3 21l1.09-3.71A8.96 8.96 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z" />
    ),
  },
  {
    titulo: "Mercado Livre",
    descricao: "Sincronize seus anúncios e pedidos do Mercado Livre direto na sua operação.",
    status: "disponivel",
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    titulo: "Centro de Prioridades",
    descricao: "O MOVA analisa sua operação e mostra só o que realmente merece sua atenção hoje.",
    status: "disponivel",
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
  },
  {
    titulo: "Inteligência artificial",
    descricao: "A IA do MOVA identifica prioridades, ajuda a montar orçamentos e organiza seu catálogo.",
    status: "disponivel",
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    ),
  },
];

export function Beneficios() {
  return (
    <section id="recursos" className="bg-surface py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">
            O que o <span className="text-brand-600">MOVA</span> centraliza
          </h2>
          <p className="mt-3 text-ink-600">
            Algumas dessas áreas já estão disponíveis hoje. Outras estão em evolução ou planejadas — somos
            transparentes sobre onde cada uma está.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recursos.map((item) => (
            <div key={item.titulo} className="rounded-xl border border-ink-200 p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    {item.icone}
                  </svg>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${SELO_POR_STATUS[item.status].classe}`}>
                  {SELO_POR_STATUS[item.status].texto}
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-ink-900">{item.titulo}</h3>
              <p className="mt-1.5 text-sm text-ink-600">{item.descricao}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
