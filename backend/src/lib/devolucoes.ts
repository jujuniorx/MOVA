import type { Prisma, PrismaClient } from "@prisma/client";
import { garantirLocalPadrao, registrarMovimentacao } from "./estoque";

type Tx = Prisma.TransactionClient | PrismaClient;

interface ItemDevolucaoParaMovimento {
  id: string;
  produtoId: string;
  variacaoId: string | null;
  quantidade: number;
}

/**
 * Recebimento físico da devolução: os itens entram em QUARENTENA, nunca em
 * estoque disponível. Esta é a única porta de entrada de produto devolvido —
 * "devolução recebida" NUNCA significa "estoque disponível +1".
 */
export async function receberItensEmQuarentena(
  tx: Tx,
  empresaId: string,
  itens: ItemDevolucaoParaMovimento[],
  devolucaoId: string,
  usuarioId?: string
) {
  const localId = await garantirLocalPadrao(tx, empresaId);
  for (const item of itens) {
    await registrarMovimentacao(tx, {
      empresaId,
      produtoId: item.produtoId,
      variacaoId: item.variacaoId ?? undefined,
      localId,
      tipo: "DEVOLUCAO_QUARENTENA",
      quantidade: item.quantidade,
      motivo: "Recebimento de devolução — aguardando conferência.",
      usuarioId,
      referenciaTipo: "Devolucao",
      referenciaId: devolucaoId,
    });
  }
}

/**
 * Decisão da conferência para UM item. INTEGRO libera da quarentena para o
 * estoque disponível; qualquer outro resultado (AVARIA/INCOMPLETO/DIVERGENTE)
 * baixa definitivamente da quarentena (nunca retorna ao disponível — em caso
 * de dúvida, o produto permanece indisponível para venda).
 */
export async function aplicarResultadoConferencia(
  tx: Tx,
  empresaId: string,
  item: ItemDevolucaoParaMovimento,
  resultado: "INTEGRO" | "AVARIA" | "INCOMPLETO" | "DIVERGENTE",
  devolucaoId: string,
  usuarioId?: string
) {
  const localId = await garantirLocalPadrao(tx, empresaId);
  if (resultado === "INTEGRO") {
    await registrarMovimentacao(tx, {
      empresaId,
      produtoId: item.produtoId,
      variacaoId: item.variacaoId ?? undefined,
      localId,
      tipo: "DEVOLUCAO_LIBERADA",
      quantidade: item.quantidade,
      motivo: "Conferência aprovada — produto íntegro, liberado para estoque disponível.",
      usuarioId,
      referenciaTipo: "Devolucao",
      referenciaId: devolucaoId,
    });
  } else {
    await registrarMovimentacao(tx, {
      empresaId,
      produtoId: item.produtoId,
      variacaoId: item.variacaoId ?? undefined,
      localId,
      tipo: "DEVOLUCAO_AVARIA",
      quantidade: item.quantidade,
      motivo: `Conferência: ${resultado} — produto não retorna ao estoque disponível.`,
      usuarioId,
      referenciaTipo: "Devolucao",
      referenciaId: devolucaoId,
    });
  }
}
