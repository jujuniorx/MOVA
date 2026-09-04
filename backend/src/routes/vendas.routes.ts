import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { idParamSchema } from "../schemas/common.schema";
import { vendaCreateSchema } from "../schemas/venda.schema";
import { darBaixaEstoqueVenda, reverterEstoqueVenda } from "../lib/vendas";
import { EstoqueInsuficienteError } from "../lib/estoque";
import { registrarEvento } from "../lib/historico";

const router = Router();

router.use(autenticar);

router.get("/", async (req, res) => {
  try {
    const vendas = await prisma.venda.findMany({
      where: { empresaId: req.usuario!.empresaId },
      orderBy: { numero: "desc" },
      include: { cliente: { select: { id: true, nome: true } }, _count: { select: { itens: true } } },
      take: 200,
    });
    return res.json(vendas);
  } catch (erro) {
    console.error("Erro ao listar vendas:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar as vendas." });
  }
});

router.get("/:id", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });

  try {
    const venda = await prisma.venda.findFirst({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
      include: { itens: true, cliente: true, devolucoes: true },
    });
    if (!venda) return res.status(404).json({ erro: "Venda não encontrada." });
    return res.json(venda);
  } catch (erro) {
    console.error("Erro ao buscar venda:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar a venda." });
  }
});

router.post("/", async (req, res) => {
  const resultado = vendaCreateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  const empresaId = req.usuario!.empresaId;
  const { clienteId, origem, desconto, itens } = resultado.data;

  try {
    if (clienteId) {
      const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, empresaId } });
      if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado." });
    }

    const produtoIds = [...new Set(itens.map((i) => i.produtoId))];
    const produtos = await prisma.produto.findMany({ where: { id: { in: produtoIds }, empresaId } });
    const produtosPorId = new Map(produtos.map((p) => [p.id, p]));

    // Preço e total NUNCA vêm do frontend — sempre recalculados aqui a
    // partir do cadastro real do produto no momento da venda.
    let subtotal = new Prisma.Decimal(0);
    const itensPreparados = itens.map((item) => {
      const produto = produtosPorId.get(item.produtoId);
      if (!produto || !produto.ativo) {
        throw new Error(`PRODUTO_INDISPONIVEL:${item.produtoId}`);
      }
      const precoUnitario = produto.preco;
      const quantidade = new Prisma.Decimal(item.quantidade);
      const itemSubtotal = quantidade.times(precoUnitario).toDecimalPlaces(2);
      subtotal = subtotal.plus(itemSubtotal);
      return { produto, quantidade: item.quantidade, variacaoId: item.variacaoId, precoUnitario, itemSubtotal };
    });

    const descontoDecimal = new Prisma.Decimal(desconto).toDecimalPlaces(2);
    if (descontoDecimal.greaterThan(subtotal)) {
      return res.status(400).json({ erro: "Desconto não pode ser maior que o subtotal." });
    }
    const total = subtotal.minus(descontoDecimal);

    const venda = await prisma.$transaction(async (tx) => {
      const novaVenda = await tx.venda.create({
        data: {
          empresaId,
          clienteId,
          origem,
          subtotal,
          desconto: descontoDecimal,
          total,
          itens: {
            create: itensPreparados.map((item) => ({
              produtoId: item.produto.id,
              nome: item.produto.nome,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              subtotal: item.itemSubtotal,
            })),
          },
        },
        include: { itens: true, cliente: { select: { id: true, nome: true } } },
      });

      await darBaixaEstoqueVenda(
        tx,
        empresaId,
        itensPreparados.map((i) => ({ produtoId: i.produto.id, variacaoId: i.variacaoId, quantidade: i.quantidade })),
        novaVenda.id,
        req.usuario!.id
      );

      return novaVenda;
    });

    registrarEvento({
      empresaId,
      tipo: "VENDA_CRIADA",
      entidadeTipo: "Venda",
      entidadeId: venda.id,
      descricao: `Venda #${venda.numero} criada (${origem}), total ${total.toString()}.`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    return res.status(201).json(venda);
  } catch (erro) {
    if (erro instanceof EstoqueInsuficienteError) {
      return res.status(409).json({ erro: erro.message });
    }
    if (erro instanceof Error && erro.message.startsWith("PRODUTO_INDISPONIVEL")) {
      return res.status(400).json({ erro: "Um ou mais produtos selecionados não estão disponíveis." });
    }
    console.error("Erro ao criar venda:", erro);
    return res.status(500).json({ erro: "Não foi possível registrar a venda." });
  }
});

router.post("/:id/cancelar", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });
  const empresaId = req.usuario!.empresaId;

  try {
    const venda = await prisma.venda.findFirst({ where: { id: idResultado.data, empresaId }, include: { itens: true } });
    if (!venda) return res.status(404).json({ erro: "Venda não encontrada." });
    if (venda.status === "CANCELADA") return res.status(409).json({ erro: "Esta venda já está cancelada." });

    const vendaCancelada = await prisma.$transaction(async (tx) => {
      await reverterEstoqueVenda(
        tx,
        empresaId,
        venda.itens.map((i) => ({ produtoId: i.produtoId, quantidade: Number(i.quantidade) })),
        venda.id,
        req.usuario!.id
      );
      return tx.venda.update({ where: { id: venda.id }, data: { status: "CANCELADA" } });
    });

    registrarEvento({
      empresaId,
      tipo: "VENDA_CANCELADA",
      entidadeTipo: "Venda",
      entidadeId: venda.id,
      descricao: `Venda #${venda.numero} cancelada — estoque estornado.`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    return res.json(vendaCancelada);
  } catch (erro) {
    console.error("Erro ao cancelar venda:", erro);
    return res.status(500).json({ erro: "Não foi possível cancelar a venda." });
  }
});

// Orçamento aprovado → Venda. Preserva o orçamento original (nunca apaga
// nem edita) e usa os valores JÁ CALCULADOS pelo backend na criação dele —
// não recalcula nada a partir de itens soltos.
router.post("/a-partir-de-orcamento/:orcamentoId", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.orcamentoId);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });
  const empresaId = req.usuario!.empresaId;

  try {
    const orcamento = await prisma.orcamento.findFirst({
      where: { id: idResultado.data, empresaId },
      include: { itens: true, vendaGerada: true },
    });
    if (!orcamento) return res.status(404).json({ erro: "Orçamento não encontrado." });
    if (orcamento.status !== "APROVADO") {
      return res.status(409).json({ erro: "Só um orçamento aprovado pode virar venda." });
    }
    if (orcamento.vendaGerada) {
      return res.status(409).json({ erro: "Este orçamento já gerou uma venda." });
    }

    const venda = await prisma.$transaction(async (tx) => {
      const novaVenda = await tx.venda.create({
        data: {
          empresaId,
          clienteId: orcamento.clienteId,
          origem: "MOVA",
          subtotal: orcamento.subtotal,
          desconto: orcamento.desconto,
          total: orcamento.total,
          orcamentoOrigemId: orcamento.id,
          itens: {
            create: orcamento.itens.map((item) => ({
              produtoId: item.produtoId,
              nome: item.nome,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              subtotal: item.subtotal,
            })),
          },
        },
        include: { itens: true, cliente: { select: { id: true, nome: true } } },
      });

      await darBaixaEstoqueVenda(
        tx,
        empresaId,
        orcamento.itens.map((i) => ({ produtoId: i.produtoId, quantidade: Number(i.quantidade) })),
        novaVenda.id,
        req.usuario!.id
      );

      return novaVenda;
    });

    registrarEvento({
      empresaId,
      tipo: "VENDA_CRIADA_DE_ORCAMENTO",
      entidadeTipo: "Venda",
      entidadeId: venda.id,
      descricao: `Venda #${venda.numero} gerada a partir do orçamento #${orcamento.numero}.`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    return res.status(201).json(venda);
  } catch (erro) {
    if (erro instanceof EstoqueInsuficienteError) {
      return res.status(409).json({ erro: erro.message });
    }
    console.error("Erro ao converter orçamento em venda:", erro);
    return res.status(500).json({ erro: "Não foi possível gerar a venda a partir do orçamento." });
  }
});

export default router;
