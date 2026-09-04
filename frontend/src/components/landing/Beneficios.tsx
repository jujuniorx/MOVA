const beneficios = [
  {
    titulo: "Rápido e fácil",
    descricao: "Crie orçamentos profissionais em poucos minutos, sem complicação.",
    icone: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    ),
  },
  {
    titulo: "Envio pelo WhatsApp",
    descricao: "Compartilhe o orçamento com o cliente em um clique, sem gerar PDF na mão.",
    icone: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.97-4.03 9-9 9a8.96 8.96 0 01-4.29-1.09L3 21l1.09-3.71A8.96 8.96 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z"
      />
    ),
  },
  {
    titulo: "Acompanhamento de status",
    descricao: "Saiba quais orçamentos estão pendentes, aprovados ou recusados, em tempo real.",
    icone: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    ),
  },
  {
    titulo: "Com a cara da sua empresa",
    descricao: "Logo e cores próprias aparecem em todos os orçamentos enviados aos seus clientes.",
    icone: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h9a2 2 0 012 2v4m-6 12h9a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"
      />
    ),
  },
  {
    titulo: "Dados isolados e protegidos",
    descricao: "Cada empresa só acessa seus próprios dados — nunca os de outra conta.",
    icone: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    ),
  },
  {
    titulo: "Painel centralizado",
    descricao: "Clientes, serviços e orçamentos organizados em um único lugar.",
    icone: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6a2 2 0 012-2h12a2 2 0 012 2v2H4V6zm0 5h16v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7z"
      />
    ),
  },
];

export function Beneficios() {
  return (
    <section id="recursos" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">
            Por que escolher o <span className="text-brand-600">MOVA</span>?
          </h2>
          <p className="mt-3 text-ink-600">
            Feito para quem vive de orçamento e não tem tempo a perder.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {beneficios.map((item) => (
            <div key={item.titulo} className="rounded-xl border border-ink-200 p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  {item.icone}
                </svg>
              </span>
              <h3 className="mt-4 font-semibold text-ink-900">{item.titulo}</h3>
              <p className="mt-1.5 text-sm text-ink-600">{item.descricao}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
