const CANAIS = ["Mercado Livre", "WhatsApp", "Site próprio"];
const DEPOIS_DO_MOVA = ["Pedido / Venda", "Estoque", "Cliente", "Histórico / Relatórios"];

export function VisaoMulticanal() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center rounded-full bg-warning-100 px-3 py-1 text-xs font-medium text-warning-700">
          Visão futura — planejado
        </span>
        <h2 className="mt-4 text-2xl font-bold text-ink-900 sm:text-3xl">Você vende onde quiser</h2>
        <p className="mt-3 text-ink-600">O MOVA organiza o que acontece por trás, não importa o canal.</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-6">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4 lg:flex-col lg:items-end">
          {CANAIS.map((canal) => (
            <span key={canal} className="rounded-full border border-ink-200 bg-surface px-4 py-2 text-sm font-medium text-ink-800">
              {canal}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-1 text-ink-300 lg:flex-row">
            <svg viewBox="0 0 24 24" className="h-6 w-6 rotate-90 lg:rotate-0" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span className="rounded-lg bg-[#141818] px-3 py-1.5 text-sm font-bold tracking-widest text-white">MOVA</span>
            <svg viewBox="0 0 24 24" className="h-6 w-6 rotate-90 lg:rotate-0" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4 lg:flex-col lg:items-start">
          {DEPOIS_DO_MOVA.map((etapa) => (
            <span key={etapa} className="rounded-full border border-ink-200 bg-surface px-4 py-2 text-sm font-medium text-ink-800">
              {etapa}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
