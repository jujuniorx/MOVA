const ETAPAS = ["Clientes", "Produtos/serviços", "Orçamentos", "Vendas", "Estoque", "Canais de venda", "Relatórios", "Inteligência"];

export function EcossistemaMova() {
  return (
    <section className="bg-ink-50 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">O ecossistema MOVA</h2>
          <p className="mt-3 text-ink-600">O MOVA conecta as partes da sua operação comercial, uma depois da outra.</p>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {ETAPAS.map((etapa, indice) => (
            <div key={etapa} className="flex items-center gap-2 sm:gap-3">
              <span className="rounded-full border border-ink-200 bg-surface px-4 py-2 text-sm font-medium text-ink-800 shadow-[var(--shadow-card)]">
                {etapa}
              </span>
              {indice < ETAPAS.length - 1 && (
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-300" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                </svg>
              )}
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-sm text-ink-500">
          O MOVA conecta a sua operação — algumas dessas etapas já estão prontas hoje, outras estão em
          evolução (veja os detalhes na seção de recursos, logo abaixo).
        </p>
      </div>
    </section>
  );
}
