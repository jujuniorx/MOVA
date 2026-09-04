import type { Prisma } from "@prisma/client";
import { registrarMovimentacao, garantirLocalPadrao } from "./estoque";

type TransacaoPrisma = Prisma.TransactionClient;

export interface ItemParaBaixa {
  produtoId: string;
  variacaoId?: string | null;
  quantidade: number;
}

/**
 * Dá baixa no estoque de uma venda — explode kits nos componentes reais e
 * só mexe em produtos que de fato controlam estoque (serviços continuam
 * passando batido, de propósito). Roda inteiramente dentro da transação do
 * chamador: se faltar saldo de qualquer item, a venda inteira é abortada
 * (nunca confirmamos uma venda que não pode ser cumprida).
 */
export async function darBaixaEstoqueVenda(
  tx: TransacaoPrisma,
  empresaId: string,
  itens: ItemParaBaixa[],
  referenciaId: string,
  usuarioId?: string | null
): Promise<void> {
  const localId = await garantirLocalPadrao(tx, empresaId);

  for (const item of itens) {
    const produto = await tx.produto.findUnique({
      where: { id: item.produtoId },
      include: { itensDoKit: { include: { componenteProduto: true } } },
    });
    if (!produto) continue;

    if (produto.tipoProduto === "KIT") {
      for (const componente of produto.itensDoKit) {
        if (!componente.componenteProduto.controlaEstoque) continue;
        await registrarMovimentacao(tx, {
          empresaId,
          produtoId: componente.componenteProdutoId,
          localId,
          tipo: "SAIDA",
          quantidade: componente.quantidade * item.quantidade,
          motivo: `Baixa automática — kit "${produto.nome}"`,
          usuarioId,
          referenciaTipo: "VENDA",
          referenciaId,
        });
      }
      continue;
    }

    if (!produto.controlaEstoque) continue;
    await registrarMovimentacao(tx, {
      empresaId,
      produtoId: item.produtoId,
      variacaoId: item.variacaoId,
      localId,
      tipo: "SAIDA",
      quantidade: item.quantidade,
      motivo: "Baixa automática de venda",
      usuarioId,
      referenciaTipo: "VENDA",
      referenciaId,
    });
  }
}

/** Reverte a baixa de uma venda cancelada — só afeta o que realmente tem controle de estoque. */
export async function reverterEstoqueVenda(
  tx: TransacaoPrisma,
  empresaId: string,
  itens: ItemParaBaixa[],
  referenciaId: string,
  usuarioId?: string | null
): Promise<void> {
  const localId = await garantirLocalPadrao(tx, empresaId);

  for (const item of itens) {
    const produto = await tx.produto.findUnique({
      where: { id: item.produtoId },
      include: { itensDoKit: { include: { componenteProduto: true } } },
    });
    if (!produto) continue;

    if (produto.tipoProduto === "KIT") {
      for (const componente of produto.itensDoKit) {
        if (!componente.componenteProduto.controlaEstoque) continue;
        await registrarMovimentacao(tx, {
          empresaId,
          produtoId: componente.componenteProdutoId,
          localId,
          tipo: "ENTRADA",
          quantidade: componente.quantidade * item.quantidade,
          motivo: `Estorno automático — cancelamento de venda (kit "${produto.nome}")`,
          usuarioId,
          referenciaTipo: "VENDA_CANCELAMENTO",
          referenciaId,
        });
      }
      continue;
    }

    if (!produto.controlaEstoque) continue;
    await registrarMovimentacao(tx, {
      empresaId,
      produtoId: item.produtoId,
      variacaoId: item.variacaoId,
      localId,
      tipo: "ENTRADA",
      quantidade: item.quantidade,
      motivo: "Estorno automático — cancelamento de venda",
      usuarioId,
      referenciaTipo: "VENDA_CANCELAMENTO",
      referenciaId,
    });
  }
}
