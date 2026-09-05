import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { idParamSchema } from "../schemas/common.schema";
import { pedidoCreateSchema } from "../schemas/pedido.schema";
import { registrarEvento } from "../lib/historico";
import { exigirModulo } from "../lib/modulos";

const router = Router();

router.use(autenticar);
router.use(exigirModulo("pedidos"));

router.get("/", async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { empresaId: req.usuario!.empresaId },
      orderBy: { numero: "desc" },
      include: {
        cliente: { select: { id: true, nome: true } },
        venda: { select: { id: true, numero: true } },
      },
      take: 200,
    });
    return res.json(pedidos);
  } catch (erro) {
    console.error("Erro ao listar pedidos:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar os pedidos." });
  }
});

router.get("/:id", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });
  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
      include: { cliente: true, venda: true },
    });
    if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado." });
    return res.json(pedido);
  } catch (erro) {
    console.error("Erro ao buscar pedido:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar o pedido." });
  }
});

// Registro manual de um pedido — hoje é a única forma real de entrada
// (WhatsApp/Mercado Livre automáticos dependem de credenciais externas
// ainda não configuradas neste ambiente; ver relatório).
router.post("/", async (req, res) => {
  const resultado = pedidoCreateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  const empresaId = req.usuario!.empresaId;
  const { canal, clienteId, referenciaExterna, itens } = resultado.data;

  try {
    if (clienteId) {
      const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, empresaId } });
      if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado." });
    }

    const total = itens.reduce((soma, item) => soma + item.quantidade * item.precoUnitario, 0);

    const pedido = await prisma.pedido.create({
      data: { empresaId, canal, clienteId, referenciaExterna, itens, total },
    });

    registrarEvento({
      empresaId,
      tipo: "PEDIDO_RECEBIDO",
      entidadeTipo: "Pedido",
      entidadeId: pedido.id,
      descricao: `Pedido #${pedido.numero} recebido via ${canal}.`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    return res.status(201).json(pedido);
  } catch (erro) {
    if (erro && typeof erro === "object" && "code" in erro && (erro as { code?: string }).code === "P2002") {
      return res.status(409).json({ erro: "Este pedido já foi registrado antes (mesma referência externa)." });
    }
    console.error("Erro ao criar pedido:", erro);
    return res.status(500).json({ erro: "Não foi possível registrar o pedido." });
  }
});

router.patch("/:id/status", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });

  const status = req.body?.status;
  if (!["RECEBIDO", "PROCESSANDO", "CONFIRMADO", "CANCELADO"].includes(status)) {
    return res.status(400).json({ erro: "Status inválido." });
  }

  try {
    const atualizacao = await prisma.pedido.updateMany({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
      data: { status },
    });
    if (atualizacao.count === 0) return res.status(404).json({ erro: "Pedido não encontrado." });
    const pedido = await prisma.pedido.findFirst({ where: { id: idResultado.data, empresaId: req.usuario!.empresaId } });
    return res.json(pedido);
  } catch (erro) {
    console.error("Erro ao atualizar status do pedido:", erro);
    return res.status(500).json({ erro: "Não foi possível atualizar o pedido." });
  }
});

export default router;
