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

/**
 * Decrementa (ou soma um delta negativo) com a checagem de saldo suficiente
 * embutida NA PRÓPRIA cláusula WHERE do UPDATE — não "lê, confere em JS,
 * depois escreve". Isso fecha a janela de corrida entre duas requisições
 * simultâneas pedindo, cada uma, o saldo inteiro disponível: o Postgres
 * serializa as duas escritas por lock de linha, e a segunda reavalia o WHERE
 * já contra o valor decrementado pela primeira — só uma das duas pode
 * passar. `updateMany` (não `update`) é o que permite combinar o filtro de
 * suficiência com a igualdade de id numa única instrução atômica.
 */
async function decrementarComGuarda(
  tx: TransacaoPrisma,
  estoqueId: string,
  campo: "quantidade" | "quantidadeQuarentena",
  quantidade: number,
  mensagemErro: string,
  camposExtra: Prisma.EstoqueLocalUpdateManyMutationInput = {}
) {
  const resultado = await tx.estoqueLocal.updateMany({
    where: { id: estoqueId, [campo]: { gte: quantidade } },
    data: { [campo]: { decrement: quantidade }, ...camposExtra },
  });
  if (resultado.count === 0) {
    throw new EstoqueInsuficienteError(mensagemErro);
  }
  return tx.estoqueLocal.findUniqueOrThrow({ where: { id: estoqueId } });
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
    await decrementarComGuarda(
      tx,
      origem.id,
      "quantidade",
      input.quantidade,
      `Saldo insuficiente no local de origem (disponível: ${origem.quantidade}).`
    );
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
  let atualizado;

  switch (input.tipo) {
    case "ENTRADA": {
      if (input.quantidade <= 0) throw new Error("Quantidade de entrada deve ser positiva.");
      atualizado = await tx.estoqueLocal.update({
        where: { id: estoque.id },
        data: { quantidade: { increment: input.quantidade } },
      });
      break;
    }
    case "SAIDA": {
      if (input.quantidade <= 0) throw new Error("Quantidade de saída deve ser positiva.");
      atualizado = await decrementarComGuarda(
        tx,
        estoque.id,
        "quantidade",
        input.quantidade,
        `Saldo insuficiente (disponível: ${estoque.quantidade}, solicitado: ${input.quantidade}).`
      );
      break;
    }
    case "AJUSTE": {
      // Delta assinado: pode zerar/corrigir saldo para mais ou para menos,
      // mas nunca deixa o resultado negativo. Delta negativo usa a mesma
      // guarda atômica das saídas; delta positivo é um increment simples.
      if (input.quantidade < 0) {
        atualizado = await decrementarComGuarda(
          tx,
          estoque.id,
          "quantidade",
          -input.quantidade,
          "Ajuste resultaria em saldo negativo — não permitido."
        );
      } else {
        atualizado = await tx.estoqueLocal.update({
          where: { id: estoque.id },
          data: { quantidade: { increment: input.quantidade } },
        });
      }
      break;
    }
    case "DEVOLUCAO_QUARENTENA": {
      // Devolução NUNCA soma em `quantidade` (disponível) — só na quarentena.
      if (input.quantidade <= 0) throw new Error("Quantidade da devolução deve ser positiva.");
      atualizado = await tx.estoqueLocal.update({
        where: { id: estoque.id },
        data: { quantidadeQuarentena: { increment: input.quantidade } },
      });
      break;
    }
    case "DEVOLUCAO_LIBERADA": {
      if (input.quantidade <= 0) throw new Error("Quantidade liberada deve ser positiva.");
      atualizado = await decrementarComGuarda(
        tx,
        estoque.id,
        "quantidadeQuarentena",
        input.quantidade,
        "Quantidade em quarentena insuficiente para liberar.",
        { quantidade: { increment: input.quantidade } }
      );
      break;
    }
    case "DEVOLUCAO_AVARIA": {
      if (input.quantidade <= 0) throw new Error("Quantidade de baixa por avaria deve ser positiva.");
      // Write-off definitivo: sai da quarentena e NUNCA entra em disponível.
      atualizado = await decrementarComGuarda(
        tx,
        estoque.id,
        "quantidadeQuarentena",
        input.quantidade,
        "Quantidade em quarentena insuficiente para dar baixa."
      );
      break;
    }
    default:
      throw new Error(`Tipo de movimentação não tratado: ${input.tipo}`);
  }

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
