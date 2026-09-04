const passos = [
  {
    numero: "1",
    titulo: "Configure seu negócio",
    descricao: "Cadastre sua empresa, defina nome, contato, logo e cores em poucos minutos.",
  },
  {
    numero: "2",
    titulo: "Cadastre clientes e produtos",
    descricao: "Organize quem você atende e o que você vende, do seu próprio jeito.",
  },
  {
    numero: "3",
    titulo: "Organize sua operação",
    descricao: "Monte orçamentos com cálculo automático e acompanhe cada etapa.",
  },
  {
    numero: "4",
    titulo: "Venda pelos seus canais",
    descricao: "Compartilhe pelo WhatsApp hoje — e, conforme o MOVA evolui, por outros canais também.",
  },
  {
    numero: "5",
    titulo: "Acompanhe tudo pelo MOVA",
    descricao: "Histórico, status e resultados sempre à mão, num só lugar.",
  },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">Como funciona</h2>
        <p className="mt-3 text-ink-600">
          Do cadastro ao fechamento, tudo em um fluxo simples — sem planilhas, sem papel.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {passos.map((passo) => (
          <div key={passo.numero} className="flex gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#141818] text-sm font-semibold text-white">
              {passo.numero}
            </span>
            <div>
              <h3 className="font-semibold text-ink-900">{passo.titulo}</h3>
              <p className="mt-1 text-sm text-ink-600">{passo.descricao}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
