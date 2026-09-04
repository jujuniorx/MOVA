const SEGMENTOS = [
  "Lojas",
  "Oficinas",
  "Marcenarias",
  "Empresas de limpeza",
  "Empresas de manutenção",
  "Prestadores de serviço",
  "Profissionais autônomos",
  "Comércio",
  "Quem vende pelo WhatsApp",
  "Quem vende em marketplaces",
];

export function TiposDeNegocio() {
  return (
    <section className="bg-ink-50 py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">O MOVA se adapta ao seu negócio</h2>
        <p className="mt-3 text-ink-600">
          Não é feito para um único segmento — cada empresa configura o que vende e o que precisa saber
          do cliente, do seu próprio jeito.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {SEGMENTOS.map((segmento) => (
            <span key={segmento} className="rounded-full border border-ink-200 bg-surface px-3.5 py-1.5 text-sm text-ink-700">
              {segmento}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
