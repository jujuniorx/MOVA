import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { idParamSchema } from "../schemas/common.schema";
import { devolucaoCreateSchema, conferenciaSchema } from "../schemas/devolucao.schema";
import { receberItensEmQuarentena, aplicarResultadoConferencia } from "../lib/devolucoes";
import { EstoqueInsuficienteError } from "../lib/estoque";
import { registrarEvento } from "../lib/historico";
import { exigirModulo } from "../lib/modulos";

const router = Router();

router.use(autenticar);
router.use(exigirModulo("vendas"));

router.get("/", async (req, res) => {
  try {
    const devolucoes = await prisma.devolucao.findMany({
      where: { empresaId: req.usuario!.empresaId },
      orderBy: { criadoEm: "desc" },
      include: { itens: true, venda: { select: { id: true, numero: true } }, pedido: { select: { id: true, numero: true } } },
      take: 200,
    });
    return res.json(devolucoes);
  } catch (erro) {
    console.error("Erro ao listar devoluções:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar as devoluções." });
  }
});

router.get("/:id", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });
  try {
    const devolucao = await prisma.devolucao.findFirst({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
      include: {
        itens: { include: { produto: { select: { id: true, nome: true, sku: true } } } },
        conferencias: { orderBy: { criadoEm: "desc" } },
        venda: { select: { id: true, numero: true } },
        pedido: { select: { id: true, numero: true } },
      },
    });
    if (!devolucao) return res.status(404).json({ erro: "Devolução não encontrada." });
    return res.json(devolucao);
  } catch (erro) {
    console.error("Erro ao buscar devolução:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar a devolução." });
  }
});

// Registro manual de uma devolução identificada. Estado inicial: IDENTIFICADA.
// Nenhuma movimentação de estoque acontece aqui — só quando o produto é
// efetivamente recebido (ver /:id/receber).
router.post("/", async (req, res) => {
  const resultado = devolucaoCreateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  const empresaId = req.usuario!.empresaId;
  const { vendaId, pedidoId, observacoes, itens } = resultado.data;

  try {
    if (vendaId) {
      const venda = await prisma.venda.findFirst({ where: { id: vendaId, empresaId } });
      if (!venda) return res.status(404).json({ erro: "Venda não encontrada." });
    }
    if (pedidoId) {
      const pedido = await prisma.pedido.findFirst({ where: { id: pedidoId, empresaId } });
      if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado." });
    }

    const produtoIds = [...new Set(itens.map((i) => i.produtoId))];
    const produtosEncontrados = await prisma.produto.count({ where: { id: { in: produtoIds }, empresaId } });
    if (produtosEncontrados !== produtoIds.length) {
      return res.status(404).json({ erro: "Um ou mais produtos informados não pertencem a esta empresa." });
    }

    const devolucao = await prisma.devolucao.create({
      data: {
        empresaId,
        origem: "MANUAL",
        vendaId,
        pedidoId,
        observacoes,
        status: "IDENTIFICADA",
        itens: {
          create: itens.map((i) => ({ produtoId: i.produtoId, variacaoId: i.variacaoId, quantidade: i.quantidade })),
        },
      },
      include: { itens: true },
    });

    registrarEvento({
      empresaId,
      tipo: "DEVOLUCAO_IDENTIFICADA",
      entidadeTipo: "Devolucao",
      entidadeId: devolucao.id,
      descricao: `Devolução identificada manualmente (${devolucao.itens.length} item(ns)).`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    return res.status(201).json(devolucao);
  } catch (erro) {
    console.error("Erro ao registrar devolução:", erro);
    return res.status(500).json({ erro: "Não foi possível registrar a devolução." });
  }
});

// Recebimento físico: produto chega e vai DIRETO para quarentena — nunca
// para estoque disponível. Guard de idempotência via updateMany com filtro
// de status: uma segunda chamada (duplo clique, retry) não move estoque de novo.
router.post("/:id/receber", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });
  const empresaId = req.usuario!.empresaId;

  try {
    const devolucao = await prisma.devolucao.findFirst({
      where: { id: idResultado.data, empresaId },
      include: { itens: true },
    });
    if (!devolucao) return res.status(404).json({ erro: "Devolução não encontrada." });

    const transicao = await prisma.devolucao.updateMany({
      where: { id: devolucao.id, empresaId, status: { in: ["IDENTIFICADA", "AGUARDANDO_RECEBIMENTO"] } },
      data: { status: "EM_CONFERENCIA" },
    });
    if (transicao.count === 0) {
      return res.status(409).json({ erro: "Esta devolução já foi recebida ou está em outro estado." });
    }

    await prisma.$transaction(async (tx) => {
      await receberItensEmQuarentena(
        tx,
        empresaId,
        devolucao.itens.map((i) => ({ id: i.id, produtoId: i.produtoId, variacaoId: i.variacaoId, quantidade: Number(i.quantidade) })),
        devolucao.id,
        req.usuario!.id
      );
    });

    registrarEvento({
      empresaId,
      tipo: "DEVOLUCAO_RECEBIDA",
      entidadeTipo: "Devolucao",
      entidadeId: devolucao.id,
      descricao: `Devolução recebida — itens em quarentena, aguardando conferência.`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    const atualizada = await prisma.devolucao.findFirst({ where: { id: devolucao.id }, include: { itens: true } });
    return res.json(atualizada);
  } catch (erro) {
    console.error("Erro ao receber devolução:", erro);
    return res.status(500).json({ erro: "Não foi possível registrar o recebimento." });
  }
});

// Conferência de UM item por vez. INTEGRO libera para estoque disponível;
// qualquer outro resultado baixa definitivamente da quarentena (write-off).
// Em caso de dúvida, o item permanece em quarentena — nunca é liberado
// automaticamente.
router.post("/:id/itens/:itemId/conferir", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  const itemIdResultado = idParamSchema.safeParse(req.params.itemId);
  if (!idResultado.success || !itemIdResultado.success) return res.status(400).json({ erro: "ID inválido." });

  const corpo = conferenciaSchema.safeParse(req.body);
  if (!corpo.success) return res.status(400).json({ erro: corpo.error.issues[0].message });

  const empresaId = req.usuario!.empresaId;
  const usuarioId = req.usuario!.id;

  try {
    const devolucao = await prisma.devolucao.findFirst({
      where: { id: idResultado.data, empresaId },
      include: { itens: true },
    });
    if (!devolucao) return res.status(404).json({ erro: "Devolução não encontrada." });
    if (!["EM_CONFERENCIA", "RECEBIDA"].includes(devolucao.status)) {
      return res.status(409).json({ erro: "Esta devolução não está em conferência." });
    }

    const item = devolucao.itens.find((i) => i.id === itemIdResultado.data);
    if (!item) return res.status(404).json({ erro: "Item não encontrado nesta devolução." });

    // Guard de idempotência: item já conferido não pode ser conferido de novo
    // (evita duplo processamento por duplo clique/retry/webhook repetido).
    const marcado = await prisma.itemDevolucao.updateMany({
      where: { id: item.id, resultadoConferencia: null },
      data: { resultadoConferencia: corpo.data.resultado, liberadoEm: corpo.data.resultado === "INTEGRO" ? new Date() : null },
    });
    if (marcado.count === 0) {
      return res.status(409).json({ erro: "Este item já foi conferido anteriormente." });
    }

    await prisma.$transaction(async (tx) => {
      await aplicarResultadoConferencia(
        tx,
        empresaId,
        { id: item.id, produtoId: item.produtoId, variacaoId: item.variacaoId, quantidade: Number(item.quantidade) },
        corpo.data.resultado,
        devolucao.id,
        usuarioId
      );
      await tx.conferenciaDevolucao.create({
        data: { devolucaoId: devolucao.id, usuarioId, resultado: corpo.data.resultado, observacoes: corpo.data.observacoes },
      });
    });

    // Se todos os itens já foram conferidos, fecha a devolução:
    // aprovada só se TODOS vieram íntegros; qualquer item não-íntegro reprova o todo.
    const todosItens = await prisma.itemDevolucao.findMany({ where: { devolucaoId: devolucao.id } });
    const todosConferidos = todosItens.every((i) => i.resultadoConferencia !== null);
    if (todosConferidos) {
      const todosIntegros = todosItens.every((i) => i.resultadoConferencia === "INTEGRO");
      await prisma.devolucao.update({
        where: { id: devolucao.id },
        data: { status: todosIntegros ? "APROVADA" : "REPROVADA" },
      });
    }

    registrarEvento({
      empresaId,
      tipo: "DEVOLUCAO_ITEM_CONFERIDO",
      entidadeTipo: "Devolucao",
      entidadeId: devolucao.id,
      descricao: `Item conferido: ${corpo.data.resultado}.`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    const atualizada = await prisma.devolucao.findFirst({ where: { id: devolucao.id }, include: { itens: true } });
    return res.json(atualizada);
  } catch (erro) {
    if (erro instanceof EstoqueInsuficienteError) {
      return res.status(409).json({ erro: erro.message });
    }
    console.error("Erro ao conferir item de devolução:", erro);
    return res.status(500).json({ erro: "Não foi possível registrar a conferência." });
  }
});

export default router;
