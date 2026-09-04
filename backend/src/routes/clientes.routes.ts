import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { isForeignKeyViolation } from "../lib/prismaErrors";
import { clienteCreateSchema, clienteUpdateSchema } from "../schemas/cliente.schema";
import { idParamSchema } from "../schemas/common.schema";
import { mensagemLimiteExcedido, verificarLimite } from "../lib/planos";

const router = Router();

router.use(autenticar);

router.post("/", async (req, res) => {
  const resultado = clienteCreateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  try {
    const empresa = await prisma.empresa.findUniqueOrThrow({
      where: { id: req.usuario!.empresaId },
      select: { id: true, planoTipo: true, trialBonusAteEm: true },
    });
    const limiteExcedido = await verificarLimite(empresa, "clientes");
    if (limiteExcedido) {
      return res.status(403).json({ erro: mensagemLimiteExcedido(limiteExcedido), codigo: "LIMITE_PLANO", ...limiteExcedido });
    }

    const cliente = await prisma.cliente.create({
      data: { ...resultado.data, empresaId: req.usuario!.empresaId },
    });
    return res.status(201).json(cliente);
  } catch (erro) {
    console.error("Erro ao criar cliente:", erro);
    return res.status(500).json({ erro: "Não foi possível criar o cliente." });
  }
});

router.get("/", async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      where: { empresaId: req.usuario!.empresaId },
      orderBy: { nome: "asc" },
    });
    return res.json(clientes);
  } catch (erro) {
    console.error("Erro ao listar clientes:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar os clientes." });
  }
});

router.get("/:id", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  try {
    const cliente = await prisma.cliente.findFirst({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
    });

    if (!cliente) {
      return res.status(404).json({ erro: "Cliente não encontrado." });
    }

    return res.json(cliente);
  } catch (erro) {
    console.error("Erro ao buscar cliente:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar o cliente." });
  }
});

router.patch("/:id", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  const resultado = clienteUpdateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  try {
    const atualizacao = await prisma.cliente.updateMany({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
      data: resultado.data,
    });

    if (atualizacao.count === 0) {
      return res.status(404).json({ erro: "Cliente não encontrado." });
    }

    const cliente = await prisma.cliente.findFirst({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
    });

    return res.json(cliente);
  } catch (erro) {
    console.error("Erro ao atualizar cliente:", erro);
    return res.status(500).json({ erro: "Não foi possível atualizar o cliente." });
  }
});

router.delete("/:id", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  try {
    const remocao = await prisma.cliente.deleteMany({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
    });

    if (remocao.count === 0) {
      return res.status(404).json({ erro: "Cliente não encontrado." });
    }

    return res.status(204).send();
  } catch (erro) {
    if (isForeignKeyViolation(erro)) {
      return res
        .status(409)
        .json({ erro: "Não é possível excluir um cliente com orçamentos vinculados." });
    }
    console.error("Erro ao excluir cliente:", erro);
    return res.status(500).json({ erro: "Não foi possível excluir o cliente." });
  }
});

export default router;
