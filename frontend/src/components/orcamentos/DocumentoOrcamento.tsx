import type { ReactNode } from "react";
import { Card } from "../ui/Card";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export interface ItemDocumento {
  nome: string;
  quantidade: string;
  precoUnitario: string;
  subtotal: string;
  detalhes?: Array<{ nome: string; valor: string }> | null;
}

export interface DocumentoOrcamentoProps {
  nomeEmpresa: string;
  logoUrl?: string | null;
  corPrimaria?: string | null;
  numero: number;
  data: string;
  validade: string | null;
  nomeCliente: string;
  contatoCliente?: string;
  itens: ItemDocumento[];
  subtotal: string;
  desconto: string;
  total: string;
  observacoes: string | null;
  statusBadge: ReactNode;
}

/**
 * Representação visual do documento de orçamento — usada tanto na
 * visualização autenticada quanto na página pública compartilhada pelo
 * WhatsApp, sempre a partir de valores já calculados pelo backend. Nenhum
 * cálculo financeiro acontece aqui.
 */
export function DocumentoOrcamento({
  nomeEmpresa,
  logoUrl,
  corPrimaria,
  numero,
  data,
  validade,
  nomeCliente,
  contatoCliente,
  itens,
  subtotal,
  desconto,
  total,
  observacoes,
  statusBadge,
}: DocumentoOrcamentoProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="h-1.5" style={{ backgroundColor: corPrimaria ?? "var(--color-brand-600)" }} />
      <div className="p-6 sm:p-10">
        <header className="flex flex-col gap-6 border-b border-ink-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={`Logo de ${nomeEmpresa}`}
                className="h-12 w-12 rounded-lg object-contain"
              />
            )}
            <div>
              <p
                className="text-xl font-semibold text-ink-900"
                style={corPrimaria ? { color: corPrimaria } : undefined}
              >
                {nomeEmpresa}
              </p>
              <p className="mt-0.5 text-sm text-ink-500">Orçamento</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-2xl font-bold text-ink-900">#{numero}</p>
            <p className="mt-0.5 text-sm text-ink-500">Emitido em {formatoData.format(new Date(data))}</p>
            {validade && (
              <p className="text-sm text-ink-500">Válido até {formatoData.format(new Date(validade))}</p>
            )}
            <div className="mt-2 sm:flex sm:justify-end">{statusBadge}</div>
          </div>
        </header>

        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Cliente</h2>
          <p className="mt-1.5 text-sm font-medium text-ink-900">{nomeCliente}</p>
          {contatoCliente && <p className="text-sm text-ink-600">{contatoCliente}</p>}
        </section>

        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Itens</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-ink-500">
                  <th className="py-2 pr-4 font-medium">Descrição</th>
                  <th className="py-2 pr-4 text-right font-medium">Qtd.</th>
                  <th className="py-2 pr-4 text-right font-medium">Preço unit.</th>
                  <th className="py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {itens.map((item, indice) => (
                  <tr key={indice}>
                    <td className="py-3 pr-4 text-ink-900">
                      <p>{item.nome}</p>
                      {item.detalhes && item.detalhes.length > 0 && (
                        <p className="mt-0.5 text-xs text-ink-500">
                          {item.detalhes.map((detalhe) => `${detalhe.nome}: ${detalhe.valor}`).join(" · ")}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right text-ink-600">{item.quantidade}</td>
                    <td className="py-3 pr-4 text-right text-ink-600">
                      {formatoMoeda.format(Number(item.precoUnitario))}
                    </td>
                    <td className="py-3 text-right font-medium text-ink-900">
                      {formatoMoeda.format(Number(item.subtotal))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 flex justify-end">
          <div className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between text-ink-600">
              <span>Subtotal</span>
              <span>{formatoMoeda.format(Number(subtotal))}</span>
            </div>
            <div className="flex justify-between text-ink-600">
              <span>Desconto</span>
              <span>- {formatoMoeda.format(Number(desconto))}</span>
            </div>
            <div className="flex justify-between border-t border-ink-200 pt-2 text-base font-semibold text-ink-900">
              <span>Total</span>
              <span>{formatoMoeda.format(Number(total))}</span>
            </div>
          </div>
        </section>

        {observacoes && (
          <section className="mt-8 border-t border-ink-200 pt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Observações</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-ink-600">{observacoes}</p>
          </section>
        )}
      </div>
    </Card>
  );
}
