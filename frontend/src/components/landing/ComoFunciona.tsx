const passos = [
  {
    numero: "1",
    titulo: "Crie sua conta",
    descricao: "Cadastre sua empresa gratuitamente em menos de um minuto.",
  },
  {
    numero: "2",
    titulo: "Configure sua identidade",
    descricao: "Defina nome, contato, logo e cores que aparecem nos seus orçamentos.",
  },
  {
    numero: "3",
    titulo: "Cadastre clientes e serviços",
    descricao: "Organize quem você atende e o que você vende, com preços prontos para usar.",
  },
  {
    numero: "4",
    titulo: "Monte o orçamento",
    descricao: "Escolha o cliente, adicione itens e o total é calculado automaticamente.",
  },
  {
    numero: "5",
    titulo: "Compartilhe pelo WhatsApp",
    descricao: "Envie um link do orçamento pronto, com a cara da sua empresa.",
  },
  {
    numero: "6",
    titulo: "Acompanhe até fechar",
    descricao: "Veja o status de cada orçamento — rascunho, enviado, aprovado ou recusado.",
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
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-semibold text-white">
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
