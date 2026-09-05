import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { exigirModulo } from "../lib/modulos";
import { idParamSchema } from "../schemas/common.schema";
import { localCreateSchema, movimentacaoCreateSchema } from "../schemas/estoque.schema";
import { calcularStatusEstoque, garantirLocalPadrao, registrarMovimentacao, EstoqueInsuficienteError } from "../lib/estoque";
import { registrarEvento } from "../lib/historico";

const router = Router();

router.use(autenticar);
router.use(exigirModulo("estoque"));

router.get("/locais", async (req, res) => {
  const empresaId = req.usuario!.empresaId;
  try {
    let locais = await prisma.local.findMany({ where: { empresaId }, orderBy: { criadoEm: "asc" } });
    if (locais.length === 0) {
      // Bootstrap: empresa nunca configurou locais — cria "Loja" na primeira
      // visita à tela de estoque, para não obrigar uma etapa extra de setup.
      await prisma.$transaction((tx) => garantirLocalPadrao(tx, empresaId));
      locais = await prisma.local.findMany({ where: { empresaId }, orderBy: { criadoEm: "asc" } });
    }
    return res.json(locais);
  } catch (erro) {
    console.error("Erro ao listar locais:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar os locais de estoque." });
  }
});

router.post("/locais", async (req, res) => {
  const resultado = localCreateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  try {
    const local = await prisma.local.create({
      data: { empresaId: req.usuario!.empresaId, nome: resultado.data.nome, tipo: resultado.data.tipo },
    });
    return res.status(201).json(local);
  } catch (erro) {
    console.error("Erro ao criar local:", erro);
    return res.status(500).json({ erro: "Não foi possível criar o local." });
  }
});

// Visão principal do estoque: um produto por linha, com saldo somado de
// todos os locais + status (Normal/Baixo/Sem estoque/Não controlado).
router.get("/", async (req, res) => {
  const empresaId = req.usuario!.empresaId;
  try {
    const produtos = await prisma.produto.findMany({
      where: { empresaId, controlaEstoque: true },
      orderBy: { nome: "asc" },
      include: {
        estoqueLocais: { include: { local: true } },
        variacoes: { include: { estoqueLocais: { include: { local: true } } } },
      },
    });

    const linhas = produtos.map((produto) => {
      const totalDisponivel = produto.estoqueLocais.reduce((soma, e) => soma + e.quantidade, 0);
      const totalQuarentena = produto.estoqueLocais.reduce((soma, e) => soma + e.quantidadeQuarentena, 0);
      return {
        produtoId: produto.id,
        nome: produto.nome,
        sku: produto.sku,
        tipoProduto: produto.tipoProduto,
        estoqueMinimo: produto.estoqueMinimo,
        totalDisponivel,
        totalQuarentena,
        status: calcularStatusEstoque(totalDisponivel, produto.estoqueMinimo, produto.controlaEstoque),
        porLocal: produto.estoqueLocais.map((e) => ({
          localId: e.localId,
          localNome: e.local.nome,
          quantidade: e.quantidade,
          quantidadeQuarentena: e.quantidadeQuarentena,
        })),
        variacoes: produto.variacoes.map((v) => ({
          id: v.id,
          nome: v.nome,
          sku: v.sku,
          totalDisponivel: v.estoqueLocais.reduce((s, e) => s + e.quantidade, 0),
        })),
      };
    });

    return res.json(linhas);
  } catch (erro) {
    console.error("Erro ao carregar estoque:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar o estoque." });
  }
});

router.get("/produtos/:id/movimentacoes", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) {
    return res.status(400).json({ erro: "ID inválido." });
  }
  const empresaId = req.usuario!.empresaId;

  try {
    const produto = await prisma.produto.findFirst({ where: { id: idResultado.data, empresaId } });
    if (!produto) return res.status(404).json({ erro: "Produto não encontrado." });

    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where: { produtoId: idResultado.data, empresaId },
      orderBy: { criadoEm: "desc" },
      take: 100,
      include: { local: { select: { nome: true } }, localOrigem: { select: { nome: true } } },
    });
    return res.json(movimentacoes);
  } catch (erro) {
    console.error("Erro ao carregar movimentações:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar o histórico do produto." });
  }
});

router.post("/movimentar", async (req, res) => {
  const resultado = movimentacaoCreateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  const empresaId = req.usuario!.empresaId;
  const { produtoId, variacaoId, localId, localOrigemId, tipo, quantidade, motivo } = resultado.data;

  try {
    const produto = await prisma.produto.findFirst({ where: { id: produtoId, empresaId } });
    if (!produto) return res.status(404).json({ erro: "Produto não encontrado." });
    if (produto.tipoProduto === "KIT") {
      return res.status(400).json({ erro: "Kits não têm estoque próprio — movimente os componentes individualmente." });
    }

    const local = await prisma.local.findFirst({ where: { id: localId, empresaId } });
    if (!local) return res.status(404).json({ erro: "Local não encontrado." });

    if (localOrigemId) {
      const localOrigem = await prisma.local.findFirst({ where: { id: localOrigemId, empresaId } });
      if (!localOrigem) return res.status(404).json({ erro: "Local de origem não encontrado." });
    }

    if (variacaoId) {
      const variacao = await prisma.produtoVariacao.findFirst({ where: { id: variacaoId, produtoId } });
      if (!variacao) return res.status(404).json({ erro: "Variação não encontrada." });
    }

    const movimentacao = await prisma.$transaction(async (tx) => {
      const quantidadeAbsoluta = tipo === "AJUSTE" ? quantidade : Math.abs(quantidade);
      return registrarMovimentacao(tx, {
        empresaId,
        produtoId,
        variacaoId,
        localId,
        localOrigemId,
        tipo,
        quantidade: quantidadeAbsoluta,
        motivo,
        usuarioId: req.usuario!.id,
      });
    });

    registrarEvento({
      empresaId,
      tipo: `ESTOQUE_${tipo}`,
      entidadeTipo: "Produto",
      entidadeId: produtoId,
      descricao: `${tipo} de ${Math.abs(quantidade)} unidade(s) de "${produto.nome}"${motivo ? ` — ${motivo}` : ""}.`,
    }).catch((erroHistorico) => console.error("Erro ao registrar histórico:", erroHistorico));

    return res.status(201).json(movimentacao);
  } catch (erro) {
    if (erro instanceof EstoqueInsuficienteError) {
      return res.status(409).json({ erro: erro.message });
    }
    console.error("Erro ao registrar movimentação:", erro);
    return res.status(500).json({ erro: "Não foi possível registrar a movimentação." });
  }
});

export default router;
