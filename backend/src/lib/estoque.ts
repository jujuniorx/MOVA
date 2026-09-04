import type { Prisma, TipoMovimentacaoEstoque } from "@prisma/client";
import { prisma } from "./prisma";

type TransacaoPrisma = Prisma.TransactionClient;

export class EstoqueInsuficienteError extends Error {}

/** Garante que a empresa tenha ao menos um local de estoque — cria "Loja" sob demanda, na primeira vez que precisar. */
export async function garantirLocalPadrao(tx: TransacaoPrisma, empresaId: string): Promise<string> {
  const existente = await tx.local.findFirst({ where: { empresaId }, orderBy: { criadoEm: "asc" } });
  if (existente) return existente.id;
  const criado = await tx.local.create({ data: { empresaId, nome: "Loja", tipo: "LOJA" } });
  return criado.id;
}

async function obterOuCriarEstoqueLocal(
  tx: TransacaoPrisma,
  produtoId: string,
  variacaoId: string | null,
  localId: string
) {
  // findFirst (não findUnique): o tipo composto gerado pelo Prisma para essa
  // chave única não aceita `null` em variacaoId, mesmo o campo sendo
  // opcional no schema — a igualdade continua garantida por índices únicos
  // parciais aplicados diretamente na migration (ver 20260904101500_*).
  const existente = await tx.estoqueLocal.findFirst({
    where: { produtoId, variacaoId, localId },
  });
  if (existente) return existente;
  return tx.estoqueLocal.create({ data: { produtoId, variacaoId, localId } });
}

export interface RegistrarMovimentacaoInput {
  empresaId: string;
  produtoId: string;
  variacaoId?: string | null;
  localId: string;
  localOrigemId?: string | null;
  tipo: TipoMovimentacaoEstoque;
  /// ENTRADA/SAIDA/TRANSFERENCIA/DEVOLUCAO_*: sempre positivo (a direção
  /// vem do `tipo`). AJUSTE: pode ser negativo (delta assinado direto).
  quantidade: number;
  motivo?: string;
  usuarioId?: string | null;
  referenciaTipo?: string;
  referenciaId?: string;
}

/**
 * Único caminho para alterar saldo de estoque no MOVA inteiro — SEMPRE
 * dentro de uma transação (chamada com o `tx` do chamador), sempre grava a
 * movimentação. Nunca chamar prisma.estoqueLocal.update() fora daqui.
 */
export async function registrarMovimentacao(tx: TransacaoPrisma, input: RegistrarMovimentacaoInput) {
  const variacaoId = input.variacaoId ?? null;

  if (input.tipo === "TRANSFERENCIA") {
    if (!input.localOrigemId) throw new Error("Transferência exige localOrigemId.");
    if (input.quantidade <= 0) throw new Error("Quantidade da transferência deve ser positiva.");

    const origem = await obterOuCriarEstoqueLocal(tx, input.produtoId, variacaoId, input.localOrigemId);
    if (origem.quantidade < input.quantidade) {
      throw new EstoqueInsuficienteError(`Saldo insuficiente no local de origem (disponível: ${origem.quantidade}).`);
    }
    await tx.estoqueLocal.update({
      where: { id: origem.id },
      data: { quantidade: { decrement: input.quantidade } },
    });
    const destino = await obterOuCriarEstoqueLocal(tx, input.produtoId, variacaoId, input.localId);
    const destinoAtualizado = await tx.estoqueLocal.update({
      where: { id: destino.id },
      data: { quantidade: { increment: input.quantidade } },
    });

    return tx.movimentacaoEstoque.create({
      data: {
        empresaId: input.empresaId,
        produtoId: input.produtoId,
        variacaoId,
        localId: input.localId,
        localOrigemId: input.localOrigemId,
        tipo: "TRANSFERENCIA",
        quantidade: input.quantidade,
        saldoResultante: destinoAtualizado.quantidade,
        motivo: input.motivo,
        usuarioId: input.usuarioId,
        referenciaTipo: input.referenciaTipo,
        referenciaId: input.referenciaId,
      },
    });
  }

  const estoque = await obterOuCriarEstoqueLocal(tx, input.produtoId, variacaoId, input.localId);
  let dataUpdate: Prisma.EstoqueLocalUpdateInput = {};

  switch (input.tipo) {
    case "ENTRADA": {
      if (input.quantidade <= 0) throw new Error("Quantidade de entrada deve ser positiva.");
      dataUpdate = { quantidade: { increment: input.quantidade } };
      break;
    }
    case "SAIDA": {
      if (input.quantidade <= 0) throw new Error("Quantidade de saída deve ser positiva.");
      if (estoque.quantidade < input.quantidade) {
        throw new EstoqueInsuficienteError(`Saldo insuficiente (disponível: ${estoque.quantidade}, solicitado: ${input.quantidade}).`);
      }
      dataUpdate = { quantidade: { decrement: input.quantidade } };
      break;
    }
    case "AJUSTE": {
      // Delta assinado: pode zerar/corrigir saldo para mais ou para menos,
      // mas nunca deixa o resultado negativo.
      const resultado = estoque.quantidade + input.quantidade;
      if (resultado < 0) {
        throw new EstoqueInsuficienteError("Ajuste resultaria em saldo negativo — não permitido.");
      }
      dataUpdate = { quantidade: resultado };
      break;
    }
    case "DEVOLUCAO_QUARENTENA": {
      // Devolução NUNCA soma em `quantidade` (disponível) — só na quarentena.
      if (input.quantidade <= 0) throw new Error("Quantidade da devolução deve ser positiva.");
      dataUpdate = { quantidadeQuarentena: { increment: input.quantidade } };
      break;
    }
    case "DEVOLUCAO_LIBERADA": {
      if (input.quantidade <= 0) throw new Error("Quantidade liberada deve ser positiva.");
      if (estoque.quantidadeQuarentena < input.quantidade) {
        throw new EstoqueInsuficienteError("Quantidade em quarentena insuficiente para liberar.");
      }
      dataUpdate = {
        quantidadeQuarentena: { decrement: input.quantidade },
        quantidade: { increment: input.quantidade },
      };
      break;
    }
    case "DEVOLUCAO_AVARIA": {
      if (input.quantidade <= 0) throw new Error("Quantidade de baixa por avaria deve ser positiva.");
      if (estoque.quantidadeQuarentena < input.quantidade) {
        throw new EstoqueInsuficienteError("Quantidade em quarentena insuficiente para dar baixa.");
      }
      // Write-off definitivo: sai da quarentena e NUNCA entra em disponível.
      dataUpdate = { quantidadeQuarentena: { decrement: input.quantidade } };
      break;
    }
    default:
      throw new Error(`Tipo de movimentação não tratado: ${input.tipo}`);
  }

  const atualizado = await tx.estoqueLocal.update({ where: { id: estoque.id }, data: dataUpdate });

  return tx.movimentacaoEstoque.create({
    data: {
      empresaId: input.empresaId,
      produtoId: input.produtoId,
      variacaoId,
      localId: input.localId,
      tipo: input.tipo,
      quantidade: input.quantidade,
      saldoResultante: atualizado.quantidade,
      motivo: input.motivo,
      usuarioId: input.usuarioId,
      referenciaTipo: input.referenciaTipo,
      referenciaId: input.referenciaId,
    },
  });
}

export type StatusEstoqueCalculado = "SEM_ESTOQUE" | "BAIXO" | "NORMAL" | "NAO_CONTROLADO";

export function calcularStatusEstoque(quantidadeTotal: number, minimo: number | null, controla: boolean): StatusEstoqueCalculado {
  if (!controla) return "NAO_CONTROLADO";
  if (quantidadeTotal <= 0) return "SEM_ESTOQUE";
  if (minimo !== null && quantidadeTotal <= minimo) return "BAIXO";
  return "NORMAL";
}

/** Soma o saldo disponível de um produto em todos os locais (nunca inclui quarentena). */
export async function saldoTotalProduto(produtoId: string): Promise<number> {
  const agregado = await prisma.estoqueLocal.aggregate({
    where: { produtoId },
    _sum: { quantidade: true },
  });
  return agregado._sum.quantidade ?? 0;
}
