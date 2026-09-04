const VANTAGENS = [
  {
    titulo: "Menos ferramentas espalhadas",
    descricao: "Centralize as informações importantes da sua operação em um só lugar.",
  },
  {
    titulo: "Mais controle",
    descricao: "Tenha uma visão melhor do que está acontecendo no seu negócio.",
  },
  {
    titulo: "Mais organização",
    descricao: "Informações e histórico sempre acessíveis, sem depender de planilhas soltas.",
  },
  {
    titulo: "Mais visibilidade",
    descricao: "Transforme os dados da sua operação em informações úteis.",
  },
  {
    titulo: "Mais escala",
    descricao: "Prepare sua empresa para crescer sem depender de controles espalhados.",
  },
];

export function Vantagens() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">Por que centralizar no MOVA</h2>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {VANTAGENS.map((item) => (
          <div key={item.titulo} className="rounded-xl border border-ink-200 p-5 text-center">
            <h3 className="font-semibold text-ink-900">{item.titulo}</h3>
            <p className="mt-1.5 text-sm text-ink-600">{item.descricao}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
