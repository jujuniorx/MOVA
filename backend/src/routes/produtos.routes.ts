import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { isForeignKeyViolation } from "../lib/prismaErrors";
import { produtoCreateSchema, produtoUpdateSchema } from "../schemas/produto.schema";
import { camposProdutoUpdateSchema } from "../schemas/campoProduto.schema";
import { kitUpdateSchema } from "../schemas/kit.schema";
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
  itensDoKit: {
    include: { componenteProduto: { select: { id: true, nome: true, sku: true, preco: true } } },
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
    if (erro && typeof erro === "object" && "code" in erro && (erro as { code?: string }).code === "P2002") {
      return res.status(409).json({ erro: "Já existe um produto com este SKU." });
    }
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
    if (erro && typeof erro === "object" && "code" in erro && (erro as { code?: string }).code === "P2002") {
      return res.status(409).json({ erro: "Já existe um produto com este SKU." });
    }
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

// Substitui TODOS os componentes de um kit de uma vez (apaga e recria numa
// transação, mesmo padrão de /campos). Só produtos tipoProduto=KIT podem ter
// componentes; um componente nunca pode ser o próprio kit (evita ciclo direto).
router.put("/:id/kit", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });

  const resultado = kitUpdateSchema.safeParse(req.body);
  if (!resultado.success) return res.status(400).json({ erro: resultado.error.issues[0].message });

  const empresaId = req.usuario!.empresaId;

  try {
    const kit = await prisma.produto.findFirst({ where: { id: idResultado.data, empresaId } });
    if (!kit) return res.status(404).json({ erro: "Produto não encontrado." });
    if (kit.tipoProduto !== "KIT") {
      return res.status(400).json({ erro: "Só um produto do tipo KIT pode ter componentes." });
    }

    const componenteIds = [...new Set(resultado.data.itens.map((i) => i.componenteProdutoId))];
    if (componenteIds.includes(kit.id)) {
      return res.status(400).json({ erro: "Um kit não pode ter a si mesmo como componente." });
    }
    if (componenteIds.length > 0) {
      const componentes = await prisma.produto.count({ where: { id: { in: componenteIds }, empresaId } });
      if (componentes !== componenteIds.length) {
        return res.status(404).json({ erro: "Um ou mais componentes informados não pertencem a esta empresa." });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.itemKit.deleteMany({ where: { kitProdutoId: kit.id } });
      if (resultado.data.itens.length > 0) {
        await tx.itemKit.createMany({
          data: resultado.data.itens.map((item) => ({
            kitProdutoId: kit.id,
            componenteProdutoId: item.componenteProdutoId,
            quantidade: item.quantidade,
          })),
        });
      }
    });

    const kitAtualizado = await prisma.produto.findFirst({
      where: { id: idResultado.data, empresaId },
      include: includeCampos,
    });
    return res.json(kitAtualizado);
  } catch (erro) {
    console.error("Erro ao atualizar componentes do kit:", erro);
    return res.status(500).json({ erro: "Não foi possível atualizar os componentes do kit." });
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
