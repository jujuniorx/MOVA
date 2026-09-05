import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { idParamSchema } from "../schemas/common.schema";
import { orcamentoSolicitacaoSchema } from "../schemas/orcamentoSolicitacao.schema";
import { prepararItens, calcularTotais } from "./orcamentos.routes";
import { mensagemLimiteExcedido, verificarLimite } from "../lib/planos";
import { validarIndicacaoSeElegivel } from "../lib/indicacao";
import { registrarEvento } from "../lib/historico";

const router = Router();

// Escrita pública (criação de solicitação de orçamento) precisa de um limite
// bem mais rígido que a leitura da vitrine — é a única rota deste arquivo
// capaz de gravar dados, e fica exposta a qualquer visitante sem login.
const limiteSolicitacao = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas solicitações. Tente novamente em alguns minutos." },
});

// Rota 100% pública (sem autenticação, sem empresaId de sessão) — o único
// filtro de identidade é o `slug` da URL. Por isso o `select` abaixo é uma
// allowlist estrita: nunca incluir clientes, orçamentos, vendas, estoque,
// SKU/custos internos ou dados de qualquer outra empresa.
router.get("/:slug", async (req, res) => {
  const slug = req.params.slug?.toLowerCase().trim();
  if (!slug) return res.status(400).json({ erro: "Endereço inválido." });

  try {
    const empresa = await prisma.empresa.findFirst({
      where: { slugPublico: slug, paginaPublicaAtiva: true },
      select: {
        nome: true,
        descricao: true,
        logoUrl: true,
        corPrimaria: true,
        corSecundaria: true,
        telefone: true,
        whatsapp: true,
        endereco: true,
        exibirPrecosPublico: true,
      },
    });

    if (!empresa) {
      return res.status(404).json({ erro: "Página não encontrada." });
    }

    const produtos = await prisma.produto.findMany({
      where: { empresa: { slugPublico: slug }, exibirNaPaginaPublica: true, ativo: true },
      select: {
        id: true,
        nome: true,
        descricao: true,
        imagemUrl: true,
        unidade: true,
        preco: empresa.exibirPrecosPublico,
      },
      orderBy: { nome: "asc" },
      take: 200,
    });

    return res.json({
      empresa: {
        nome: empresa.nome,
        descricao: empresa.descricao,
        logoUrl: empresa.logoUrl,
        corPrimaria: empresa.corPrimaria,
        corSecundaria: empresa.corSecundaria,
        telefone: empresa.telefone,
        whatsapp: empresa.whatsapp,
        endereco: empresa.endereco,
      },
      exibirPrecos: empresa.exibirPrecosPublico,
      produtos,
    });
  } catch (erro) {
    console.error("Erro ao carregar página pública:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar esta página." });
  }
});

// Detalhe de UM produto/serviço público — inclui os campos configuráveis
// (mesmos usados no orçamento interno) para o visitante preencher antes de
// pedir o orçamento. Nunca retorna produtos que a empresa não marcou como
// públicos, mesmo que o ID seja válido para outro produto da mesma empresa.
router.get("/:slug/produtos/:produtoId", async (req, res) => {
  const slug = req.params.slug?.toLowerCase().trim();
  const idResultado = idParamSchema.safeParse(req.params.produtoId);
  if (!slug || !idResultado.success) return res.status(400).json({ erro: "Requisição inválida." });

  try {
    const empresa = await prisma.empresa.findFirst({
      where: { slugPublico: slug, paginaPublicaAtiva: true },
      select: { id: true, exibirPrecosPublico: true },
    });
    if (!empresa) return res.status(404).json({ erro: "Página não encontrada." });

    const produto = await prisma.produto.findFirst({
      where: { id: idResultado.data, empresaId: empresa.id, exibirNaPaginaPublica: true, ativo: true },
      select: {
        id: true,
        nome: true,
        descricao: true,
        imagemUrl: true,
        unidade: true,
        preco: empresa.exibirPrecosPublico,
        campos: {
          orderBy: { ordem: "asc" },
          select: {
            id: true,
            nome: true,
            tipo: true,
            unidade: true,
            obrigatorio: true,
            opcoes: { orderBy: { ordem: "asc" }, select: { id: true, rotulo: true } },
          },
        },
      },
    });
    if (!produto) return res.status(404).json({ erro: "Produto não encontrado." });

    return res.json(produto);
  } catch (erro) {
    console.error("Erro ao carregar produto público:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar este produto." });
  }
});

// Cliente final solicita um orçamento diretamente pela página pública —
// alimenta a MESMA estrutura de Cliente/Orçamento do fluxo interno (nunca um
// modelo paralelo), com preço SEMPRE recalculado a partir do cadastro real
// do produto (o schema de entrada nem aceita precoUnitario do visitante).
router.post("/:slug/orcamentos", limiteSolicitacao, async (req, res) => {
  const slug = String(req.params.slug ?? "").toLowerCase().trim();
  if (!slug) return res.status(400).json({ erro: "Endereço inválido." });

  const resultado = orcamentoSolicitacaoSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  const { clienteNome, clienteTelefone, clienteEmail, observacoes, itens } = resultado.data;

  try {
    const empresa = await prisma.empresa.findFirst({
      where: { slugPublico: slug, paginaPublicaAtiva: true },
      select: { id: true, planoTipo: true, trialBonusAteEm: true },
    });
    if (!empresa) return res.status(404).json({ erro: "Página não encontrada." });

    const limiteExcedido = await verificarLimite(empresa, "orcamentos");
    if (limiteExcedido) {
      return res.status(403).json({ erro: "Esta empresa atingiu o limite de solicitações do momento. Tente novamente mais tarde ou entre em contato diretamente." });
    }

    // Só produtos explicitamente públicos podem ser pedidos por aqui — um
    // produto interno (mesmo ativo) nunca pode ser referenciado a partir da
    // página pública, mesmo sabendo o ID.
    const produtoIds = [...new Set(itens.map((i) => i.produtoId))];
    const produtosPublicos = await prisma.produto.count({
      where: { id: { in: produtoIds }, empresaId: empresa.id, exibirNaPaginaPublica: true, ativo: true },
    });
    if (produtosPublicos !== produtoIds.length) {
      return res.status(400).json({ erro: "Um ou mais itens selecionados não estão disponíveis." });
    }

    const preparo = await prepararItens(empresa.id, itens);
    if ("erro" in preparo) {
      return res.status(400).json({ erro: preparo.erro });
    }
    const totais = calcularTotais(preparo.itens, undefined);
    if ("erro" in totais) {
      return res.status(400).json({ erro: totais.erro });
    }

    let cliente = clienteTelefone
      ? await prisma.cliente.findFirst({ where: { empresaId: empresa.id, telefone: clienteTelefone } })
      : null;
    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: { empresaId: empresa.id, nome: clienteNome, telefone: clienteTelefone, email: clienteEmail },
      });
    }

    const orcamento = await prisma.orcamento.create({
      data: {
        empresaId: empresa.id,
        clienteId: cliente.id,
        observacoes,
        status: "ENVIADO",
        subtotal: totais.subtotal,
        desconto: totais.desconto,
        total: totais.total,
        itens: {
          create: preparo.itens.map((item) => ({
            produtoId: item.produtoId,
            variacaoId: item.variacaoId,
            nome: item.nome,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            subtotal: item.subtotal,
            detalhes: item.detalhes.length > 0 ? item.detalhes : undefined,
          })),
        },
      },
      select: { id: true, numero: true, total: true },
    });

    validarIndicacaoSeElegivel(empresa.id).catch((e) => console.error("Erro ao validar indicação:", e));
    registrarEvento({
      empresaId: empresa.id,
      tipo: "ORCAMENTO_SOLICITADO_PUBLICO",
      entidadeTipo: "Orcamento",
      entidadeId: orcamento.id,
      descricao: `Solicitação de orçamento recebida pela página pública (${clienteNome}).`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    return res.status(201).json({ numero: orcamento.numero });
  } catch (erro) {
    console.error("Erro ao criar solicitação de orçamento pública:", erro);
    return res.status(500).json({ erro: "Não foi possível enviar sua solicitação." });
  }
});

export default router;
