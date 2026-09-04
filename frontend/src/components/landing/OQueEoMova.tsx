const FERRAMENTAS_ESPALHADAS = [
  "uma planilha para clientes",
  "um caderno para orçamentos",
  "o WhatsApp para vendas",
  "outro app para estoque",
];

export function OQueEoMova() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">O que é o MOVA?</h2>
          <p className="mt-4 text-ink-600">
            A maioria das empresas usa várias ferramentas diferentes para controlar clientes, produtos,
            estoque, vendas, pedidos, conversas no WhatsApp e vendas em marketplaces — cada coisa num
            lugar, sem conexão entre elas.
          </p>
          <p className="mt-4 text-ink-600">
            O MOVA existe para resolver isso. A visão do produto é centralizar essa operação comercial
            inteira em um único lugar — hoje já cobrindo clientes, produtos, orçamentos e o começo da
            venda, e evoluindo passo a passo para o restante.
          </p>
        </div>

        <div className="rounded-xl border border-ink-200 bg-surface p-6 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Sem o MOVA</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {FERRAMENTAS_ESPALHADAS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-ink-600">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-danger-600" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
          <div className="my-4 border-t border-ink-100" />
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Com o MOVA</p>
          <p className="mt-3 flex items-start gap-2 text-sm text-ink-700">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-success-600" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Tudo conectado, no mesmo lugar, com o histórico da sua operação sempre à mão.
          </p>
        </div>
      </div>
    </section>
  );
}
