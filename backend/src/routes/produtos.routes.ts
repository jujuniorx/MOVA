import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { isForeignKeyViolation } from "../lib/prismaErrors";
import { produtoCreateSchema, produtoUpdateSchema } from "../schemas/produto.schema";
import { camposProdutoUpdateSchema } from "../schemas/campoProduto.schema";
import { idParamSchema } from "../schemas/common.schema";
import { mensagemLimiteExcedido, verificarLimite } from "../lib/planos";

const router = Router();

router.use(autenticar);

const includeCampos = {
  campos: {
    orderBy: { ordem: "asc" as const },
    include: {
      opcoes: { orderBy: { ordem: "asc" as const } },
    },
  },
};

router.post("/", async (req, res) => {
  const resultado = produtoCreateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  try {
    const empresa = await prisma.empresa.findUniqueOrThrow({
      where: { id: req.usuario!.empresaId },
      select: { id: true, planoTipo: true, trialBonusAteEm: true },
    });
    const limiteExcedido = await verificarLimite(empresa, "produtos");
    if (limiteExcedido) {
      return res.status(403).json({ erro: mensagemLimiteExcedido(limiteExcedido), codigo: "LIMITE_PLANO", ...limiteExcedido });
    }

    const produto = await prisma.produto.create({
      data: { ...resultado.data, empresaId: req.usuario!.empresaId },
      include: includeCampos,
    });
    return res.status(201).json(produto);
  } catch (erro) {
    console.error("Erro ao criar produto:", erro);
    return res.status(500).json({ erro: "Não foi possível criar o produto." });
  }
});

router.get("/", async (req, res) => {
  const filtroAtivo =
    req.query.ativo === "true" ? true : req.query.ativo === "false" ? false : undefined;

  try {
    const produtos = await prisma.produto.findMany({
      where: {
        empresaId: req.usuario!.empresaId,
        ...(filtroAtivo !== undefined ? { ativo: filtroAtivo } : {}),
      },
      orderBy: { nome: "asc" },
      include: includeCampos,
    });
    return res.json(produtos);
  } catch (erro) {
    console.error("Erro ao listar produtos:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar os produtos." });
  }
});

router.get("/:id", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  try {
    const produto = await prisma.produto.findFirst({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
      include: includeCampos,
    });

    if (!produto) {
      return res.status(404).json({ erro: "Produto não encontrado." });
    }

    return res.json(produto);
  } catch (erro) {
    console.error("Erro ao buscar produto:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar o produto." });
  }
});

router.patch("/:id", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  const resultado = produtoUpdateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  try {
    const atualizacao = await prisma.produto.updateMany({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
      data: resultado.data,
    });

    if (atualizacao.count === 0) {
      return res.status(404).json({ erro: "Produto não encontrado." });
    }

    const produto = await prisma.produto.findFirst({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
      include: includeCampos,
    });

    return res.json(produto);
  } catch (erro) {
    console.error("Erro ao atualizar produto:", erro);
    return res.status(500).json({ erro: "Não foi possível atualizar o produto." });
  }
});

// Substitui TODOS os campos configuráveis do produto de uma vez (mesmo
// padrão já usado em PUT /orcamentos/:id para os itens: apaga e recria numa
// transação). A posse do produto é checada uma única vez aqui — os campos e
// opções não têm empresaId próprio porque são sempre acessados através dele.
router.put("/:id/campos", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  const resultado = camposProdutoUpdateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  const empresaId = req.usuario!.empresaId;

  try {
    const produto = await prisma.produto.findFirst({
      where: { id: idResultado.data, empresaId },
    });

    if (!produto) {
      return res.status(404).json({ erro: "Produto não encontrado." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.campoProduto.deleteMany({ where: { produtoId: produto.id } });

      for (let indice = 0; indice < resultado.data.campos.length; indice++) {
        const campo = resultado.data.campos[indice];
        await tx.campoProduto.create({
          data: {
            produtoId: produto.id,
            nome: campo.nome,
            tipo: campo.tipo,
            unidade: campo.unidade,
            obrigatorio: campo.obrigatorio,
            ordem: indice,
            opcoes: campo.opcoes
              ? {
                  create: campo.opcoes.map((opcao, opcaoIndice) => ({
                    rotulo: opcao.rotulo,
                    ordem: opcaoIndice,
                  })),
                }
              : undefined,
          },
        });
      }
    });

    const produtoAtualizado = await prisma.produto.findFirst({
      where: { id: idResultado.data, empresaId },
      include: includeCampos,
    });

    return res.json(produtoAtualizado);
  } catch (erro) {
    console.error("Erro ao atualizar campos do produto:", erro);
    return res.status(500).json({ erro: "Não foi possível atualizar os campos do produto." });
  }
});

router.delete("/:id", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  try {
    const remocao = await prisma.produto.deleteMany({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
    });

    if (remocao.count === 0) {
      return res.status(404).json({ erro: "Produto não encontrado." });
    }

    return res.status(204).send();
  } catch (erro) {
    if (isForeignKeyViolation(erro)) {
      return res.status(409).json({
        erro: "Não é possível excluir um produto com orçamentos vinculados. Desative-o em vez de excluir.",
      });
    }
    console.error("Erro ao excluir produto:", erro);
    return res.status(500).json({ erro: "Não foi possível excluir o produto." });
  }
});

export default router;
