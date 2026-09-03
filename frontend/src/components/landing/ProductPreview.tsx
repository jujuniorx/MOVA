const orcamentosExemplo = [
  { numero: "#014", cliente: "Cliente A", valor: "R$ 850,00", status: "Aprovado", cor: "text-success-600" },
  { numero: "#013", cliente: "Cliente B", valor: "R$ 1.250,00", status: "Enviado", cor: "text-facil-600" },
  { numero: "#012", cliente: "Cliente C", valor: "R$ 430,00", status: "Rascunho", cor: "text-slate-500" },
];

/**
 * Representação ilustrativa do produto (dashboard + orçamento no celular),
 * construída só com HTML/CSS — sem números de clientes reais, sem
 * avaliações e sem nomes de empresas fictícias apresentadas como clientes.
 */
export function ProductPreview() {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="ml-3 text-xs font-medium text-slate-400">Painel do OrçaFácil</span>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-[11px] text-slate-500">Orçamentos</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">18</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-[11px] text-slate-500">Aprovados</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">11</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-[11px] text-slate-500">Valor total</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">R$ 9.2k</p>
            </div>
          </div>

          <p className="mt-4 text-xs font-medium text-slate-500">Atividades recentes</p>
          <div className="mt-2 divide-y divide-slate-100">
            {orcamentosExemplo.map((item) => (
              <div key={item.numero} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700">
                  {item.numero} · {item.cliente}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{item.valor}</span>
                  <span className={`text-xs font-medium ${item.cor}`}>{item.status}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-8 -right-6 w-40 rounded-2xl border-4 border-slate-900 bg-white shadow-xl sm:-right-10 sm:w-48">
        <div className="rounded-t-lg bg-orca-900 px-3 py-2 text-center text-[10px] font-medium text-white">
          Orçamento #014
        </div>
        <div className="p-3">
          <p className="text-[10px] text-slate-500">Total</p>
          <p className="text-base font-bold text-slate-900">R$ 850,00</p>
          <div className="mt-2 rounded-md bg-success-100 px-2 py-1 text-center text-[10px] font-medium text-success-600">
            Aprovado
          </div>
          <div className="mt-2 flex items-center justify-center gap-1 rounded-md bg-facil-600 px-2 py-1.5 text-[10px] font-medium text-white">
            Enviar no WhatsApp
          </div>
        </div>
      </div>
    </div>
  );
}
