import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { idParamSchema } from "../schemas/common.schema";
import { vendaCreateSchema } from "../schemas/venda.schema";
import { darBaixaEstoqueVenda, reverterEstoqueVenda } from "../lib/vendas";
import { EstoqueInsuficienteError } from "../lib/estoque";
import { registrarEvento } from "../lib/historico";
import { exigirModulo } from "../lib/modulos";

const router = Router();

router.use(autenticar);
router.use(exigirModulo("vendas"));

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
    const produtos = await prisma.produto.findMany({
      where: { id: { in: produtoIds }, empresaId },
      include: { variacoes: true },
    });
    const produtosPorId = new Map(produtos.map((p) => [p.id, p]));

    // Preço e total NUNCA vêm do frontend — sempre recalculados aqui a
    // partir do cadastro real do produto (e da variação, quando informada)
    // no momento da venda. A variação precisa pertencer a ESTE produto
    // (portanto já implicitamente a esta empresa) e estar ativa — mesma
    // validação já usada em orçamentos, garante isolamento multi-tenant
    // mesmo que alguém tente enviar o ID de variação de outra empresa.
    let subtotal = new Prisma.Decimal(0);
    const itensPreparados = itens.map((item) => {
      const produto = produtosPorId.get(item.produtoId);
      if (!produto || !produto.ativo) {
        throw new Error(`PRODUTO_INDISPONIVEL:${item.produtoId}`);
      }

      let variacao: (typeof produto.variacoes)[number] | undefined;
      if (item.variacaoId !== undefined) {
        variacao = produto.variacoes.find((v) => v.id === item.variacaoId);
        if (!variacao || !variacao.ativa) {
          throw new Error(`VARIACAO_INVALIDA:${produto.nome}`);
        }
      }

      const precoUnitario = produto.preco.plus(variacao?.precoAdicional ?? 0);
      const quantidade = new Prisma.Decimal(item.quantidade);
      const itemSubtotal = quantidade.times(precoUnitario).toDecimalPlaces(2);
      subtotal = subtotal.plus(itemSubtotal);
      const nomeItem = variacao ? `${produto.nome} — ${variacao.nome}` : produto.nome;
      return { produto, nomeItem, quantidade: item.quantidade, variacaoId: variacao?.id, precoUnitario, itemSubtotal };
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
              variacaoId: item.variacaoId,
              nome: item.nomeItem,
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
    if (erro instanceof Error && erro.message.startsWith("VARIACAO_INVALIDA")) {
      return res.status(400).json({ erro: `Variação selecionada para "${erro.message.split(":")[1]}" não está disponível.` });
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
        venda.itens.map((i) => ({ produtoId: i.produtoId, variacaoId: i.variacaoId, quantidade: Number(i.quantidade) })),
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
              variacaoId: item.variacaoId,
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
        orcamento.itens.map((i) => ({ produtoId: i.produtoId, variacaoId: i.variacaoId, quantidade: Number(i.quantidade) })),
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

const ORIGEM_POR_CANAL: Record<string, "WHATSAPP" | "MERCADO_LIVRE" | "SITE_PROPRIO" | "MOVA"> = {
  WHATSAPP: "WHATSAPP",
  MERCADO_LIVRE: "MERCADO_LIVRE",
  SITE_PROPRIO: "SITE_PROPRIO",
  MANUAL: "MOVA",
};

interface ItemPedidoSnapshot {
  nome: string;
  quantidade: number;
  precoUnitario: number;
  produtoId?: string;
  variacaoId?: string;
}

// Pedido → Venda. CANAL → PEDIDO → PRODUTO → ESTOQUE → VENDA: um pedido é
// só um snapshot dos itens recebidos (pode chegar sem nenhum produto do
// catálogo mapeado ainda) — só vira Venda de verdade quando TODOS os itens
// já apontam para um Produto real, porque é isso que permite dar baixa em
// estoque com segurança. Preço/total nunca são recalculados aqui: o pedido
// já registrou o preço no momento em que chegou.
router.post("/a-partir-de-pedido/:pedidoId", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.pedidoId);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });
  const empresaId = req.usuario!.empresaId;

  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: idResultado.data, empresaId },
      include: { venda: true },
    });
    if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado." });
    if (pedido.venda) return res.status(409).json({ erro: "Este pedido já gerou uma venda." });
    if (pedido.status === "CANCELADO") {
      return res.status(409).json({ erro: "Um pedido cancelado não pode virar venda." });
    }

    const itensSnapshot = pedido.itens as unknown as ItemPedidoSnapshot[];
    const semProduto = itensSnapshot.filter((item) => !item.produtoId);
    if (semProduto.length > 0) {
      const mensagem =
        semProduto.length === itensSnapshot.length
          ? "Nenhum item deste pedido está ligado a um produto do catálogo."
          : `${semProduto.length} ${semProduto.length === 1 ? "item" : "itens"} deste pedido ainda não ${semProduto.length === 1 ? "está ligado" : "estão ligados"} a um produto do catálogo.`;
      return res.status(400).json({
        erro: `${mensagem} Edite o pedido e associe um produto a cada item antes de converter em venda.`,
      });
    }

    const produtoIds = [...new Set(itensSnapshot.map((item) => item.produtoId!))];
    const produtos = await prisma.produto.findMany({
      where: { id: { in: produtoIds }, empresaId },
      include: { variacoes: true },
    });
    const produtosPorId = new Map(produtos.map((p) => [p.id, p]));

    const itensInvalidos = itensSnapshot.filter((item) => !produtosPorId.get(item.produtoId!)?.ativo);
    if (itensInvalidos.length > 0) {
      return res.status(400).json({ erro: "Um ou mais produtos deste pedido não existem mais ou foram desativados." });
    }

    // Mesma validação de variação já usada em orçamento/venda direta —
    // precisa pertencer ao produto do próprio item (logo, à mesma empresa) e
    // estar ativa. Protege sobretudo a baixa de estoque: sem isso, um
    // variacaoId de outro produto/empresa poderia acabar não decrementando
    // nenhum saldo real (silenciosamente) em vez de dar erro claro.
    for (const item of itensSnapshot) {
      if (item.variacaoId === undefined) continue;
      const produto = produtosPorId.get(item.produtoId!);
      const variacaoValida = produto?.variacoes.some((v) => v.id === item.variacaoId && v.ativa);
      if (!variacaoValida) {
        return res.status(400).json({ erro: `Variação selecionada para "${item.nome}" não está disponível.` });
      }
    }

    const subtotal = itensSnapshot.reduce(
      (soma, item) => soma.plus(new Prisma.Decimal(item.quantidade).times(item.precoUnitario)),
      new Prisma.Decimal(0)
    );

    const venda = await prisma.$transaction(async (tx) => {
      const novaVenda = await tx.venda.create({
        data: {
          empresaId,
          clienteId: pedido.clienteId,
          origem: ORIGEM_POR_CANAL[pedido.canal] ?? "OUTRO",
          pedidoOrigemId: pedido.id,
          subtotal,
          desconto: 0,
          total: subtotal,
          itens: {
            create: itensSnapshot.map((item) => ({
              produtoId: item.produtoId!,
              variacaoId: item.variacaoId,
              nome: item.nome,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              subtotal: new Prisma.Decimal(item.quantidade).times(item.precoUnitario),
            })),
          },
        },
        include: { itens: true, cliente: { select: { id: true, nome: true } } },
      });

      await tx.pedido.update({ where: { id: pedido.id }, data: { status: "CONFIRMADO" } });

      await darBaixaEstoqueVenda(
        tx,
        empresaId,
        itensSnapshot.map((i) => ({ produtoId: i.produtoId!, variacaoId: i.variacaoId, quantidade: i.quantidade })),
        novaVenda.id,
        req.usuario!.id
      );

      return novaVenda;
    });

    registrarEvento({
      empresaId,
      tipo: "VENDA_CRIADA_DE_PEDIDO",
      entidadeTipo: "Venda",
      entidadeId: venda.id,
      descricao: `Venda #${venda.numero} gerada a partir do pedido #${pedido.numero} (${pedido.canal}).`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    return res.status(201).json(venda);
  } catch (erro) {
    if (erro instanceof EstoqueInsuficienteError) {
      return res.status(409).json({ erro: erro.message });
    }
    console.error("Erro ao converter pedido em venda:", erro);
    return res.status(500).json({ erro: "Não foi possível gerar a venda a partir do pedido." });
  }
});

export default router;
