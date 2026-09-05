import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { isForeignKeyViolation } from "../lib/prismaErrors";
import { clienteCreateSchema, clienteUpdateSchema } from "../schemas/cliente.schema";
import { camposClienteUpdateSchema } from "../schemas/campoCliente.schema";
import { idParamSchema } from "../schemas/common.schema";
import { mensagemLimiteExcedido, verificarLimite } from "../lib/planos";
import { registrarEvento } from "../lib/historico";

const router = Router();

router.use(autenticar);

const includeCamposCliente = {
  opcoes: { orderBy: { ordem: "asc" as const } },
};

// Informações extras que a empresa decide perguntar de TODO cliente (ex.:
// "Data de nascimento") — por empresa, não por cliente, então essas rotas
// vêm antes de "/:id" para "/campos" não ser confundido com um ID.
router.get("/campos", async (req, res) => {
  try {
    const campos = await prisma.campoCliente.findMany({
      where: { empresaId: req.usuario!.empresaId },
      orderBy: { ordem: "asc" },
      include: includeCamposCliente,
    });
    return res.json(campos);
  } catch (erro) {
    console.error("Erro ao listar campos de cliente:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar as informações personalizadas." });
  }
});

// Substitui TODOS os campos personalizados de cliente da empresa de uma vez
// (mesmo padrão de PUT /produtos/:id/campos: apaga e recria numa transação).
router.put("/campos", async (req, res) => {
  const resultado = camposClienteUpdateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  const empresaId = req.usuario!.empresaId;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.campoCliente.deleteMany({ where: { empresaId } });

      for (let indice = 0; indice < resultado.data.campos.length; indice++) {
        const campo = resultado.data.campos[indice];
        await tx.campoCliente.create({
          data: {
            empresaId,
            nome: campo.nome,
            tipo: campo.tipo,
            unidade: campo.unidade,
            obrigatorio: campo.obrigatorio,
            ordem: indice,
            opcoes: campo.opcoes
              ? { create: campo.opcoes.map((opcao, opcaoIndice) => ({ rotulo: opcao.rotulo, ordem: opcaoIndice })) }
              : undefined,
          },
        });
      }
    });

    const campos = await prisma.campoCliente.findMany({
      where: { empresaId },
      orderBy: { ordem: "asc" },
      include: includeCamposCliente,
    });
    return res.json(campos);
  } catch (erro) {
    console.error("Erro ao atualizar campos de cliente:", erro);
    return res.status(500).json({ erro: "Não foi possível atualizar as informações personalizadas." });
  }
});

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

    registrarEvento({
      empresaId: req.usuario!.empresaId,
      tipo: "CLIENTE_CRIADO",
      entidadeTipo: "Cliente",
      entidadeId: cliente.id,
      descricao: `Cliente "${cliente.nome}" cadastrado.`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

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

// Timeline do cliente: reaproveita o histórico central (EventoHistorico) já
// registrado pelas próprias operações (orçamento criado/enviado/aprovado,
// venda criada, pedido recebido, devolução etc) — filtrando pelas entidades
// que pertencem a ESTE cliente. Não duplica lógica de descrição: cada
// evento já foi escrito com um texto pronto no momento em que aconteceu.
router.get("/:id/historico", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });
  const empresaId = req.usuario!.empresaId;

  try {
    const cliente = await prisma.cliente.findFirst({ where: { id: idResultado.data, empresaId } });
    if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado." });

    const [orcamentos, vendas, pedidos] = await Promise.all([
      prisma.orcamento.findMany({ where: { clienteId: cliente.id }, select: { id: true } }),
      prisma.venda.findMany({ where: { clienteId: cliente.id }, select: { id: true } }),
      prisma.pedido.findMany({ where: { clienteId: cliente.id }, select: { id: true } }),
    ]);
    const vendaIds = vendas.map((v) => v.id);
    const pedidoIds = pedidos.map((p) => p.id);

    const devolucoes =
      vendaIds.length + pedidoIds.length > 0
        ? await prisma.devolucao.findMany({
            where: { OR: [{ vendaId: { in: vendaIds } }, { pedidoId: { in: pedidoIds } }] },
            select: { id: true },
          })
        : [];

    const entidadeIds = [
      cliente.id,
      ...orcamentos.map((o) => o.id),
      ...vendaIds,
      ...pedidoIds,
      ...devolucoes.map((d) => d.id),
    ];

    const eventos = await prisma.eventoHistorico.findMany({
      where: { empresaId, entidadeId: { in: entidadeIds } },
      orderBy: { criadoEm: "desc" },
      take: 100,
    });

    return res.json(eventos);
  } catch (erro) {
    console.error("Erro ao carregar histórico do cliente:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar o histórico do cliente." });
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
