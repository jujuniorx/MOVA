import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { isForeignKeyViolation } from "../lib/prismaErrors";
import { produtoCreateSchema, produtoUpdateSchema } from "../schemas/produto.schema";
import { camposProdutoUpdateSchema } from "../schemas/campoProduto.schema";
import { kitUpdateSchema } from "../schemas/kit.schema";
import { variacoesUpdateSchema } from "../schemas/variacao.schema";
import { idParamSchema } from "../schemas/common.schema";
import { importarPreviewSchema, importarConfirmarSchema } from "../schemas/importacao.schema";
import { mensagemLimiteExcedido, verificarLimite, planoEfetivo, obterConfigPlano } from "../lib/planos";
import { registrarEvento } from "../lib/historico";
import { decodificarArquivo, sugerirMapeamento, aplicarMapeamento, ArquivoImportacaoError } from "../lib/importacao";
import { parseNumeroBr } from "../lib/csv";
import type { CampoImportavel } from "../lib/importacao";

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
  variacoes: { orderBy: { nome: "asc" as const } },
};

const CAMPOS_IMPORTAVEIS_PRODUTO: CampoImportavel[] = [
  { campo: "nome", rotulo: "Nome", obrigatorio: true, sinonimos: ["name", "produto", "item"] },
  { campo: "preco", rotulo: "Preço", obrigatorio: true, sinonimos: ["price", "valor"] },
  { campo: "descricao", rotulo: "Descrição", obrigatorio: false, sinonimos: ["description", "desc"] },
  { campo: "unidade", rotulo: "Unidade", obrigatorio: false, sinonimos: ["unit", "medida"] },
  { campo: "sku", rotulo: "SKU", obrigatorio: false, sinonimos: ["codigo", "code", "referencia"] },
];

router.post("/importar/preview", async (req, res) => {
  const resultado = importarPreviewSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  try {
    const arquivo = decodificarArquivo(resultado.data.arquivoBase64);
    return res.json({
      colunas: arquivo.cabecalho,
      linhasExemplo: arquivo.linhas.slice(0, 10),
      totalLinhas: arquivo.totalLinhas,
      campos: CAMPOS_IMPORTAVEIS_PRODUTO,
      mapeamentoSugerido: sugerirMapeamento(arquivo.cabecalho, CAMPOS_IMPORTAVEIS_PRODUTO),
    });
  } catch (erro) {
    if (erro instanceof ArquivoImportacaoError) {
      return res.status(400).json({ erro: erro.message });
    }
    console.error("Erro ao pré-visualizar importação de produtos:", erro);
    return res.status(500).json({ erro: "Não foi possível ler o arquivo." });
  }
});

router.post("/importar/confirmar", async (req, res) => {
  const resultado = importarConfirmarSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  const empresaId = req.usuario!.empresaId;
  const { mapeamento, importarDuplicados } = resultado.data;

  try {
    const arquivo = decodificarArquivo(resultado.data.arquivoBase64);

    const empresa = await prisma.empresa.findUniqueOrThrow({
      where: { id: empresaId },
      select: { id: true, planoTipo: true, trialBonusAteEm: true },
    });

    const existentes = await prisma.produto.findMany({
      where: { empresaId },
      select: { nome: true, sku: true },
    });
    const nomesExistentes = new Set(existentes.map((p) => p.nome.toLowerCase()));
    const skusExistentes = new Set(existentes.map((p) => p.sku?.toLowerCase()).filter(Boolean));
    const nomesNesteArquivo = new Set<string>();
    const skusNesteArquivo = new Set<string>();

    const invalidos: { linha: number; motivo: string }[] = [];
    const duplicados: { linha: number; motivo: string }[] = [];
    const paraCriar: { nome: string; preco: number; descricao?: string; unidade?: string; sku?: string }[] = [];

    arquivo.linhas.forEach((linha, indice) => {
      const numeroLinha = indice + 2;
      const bruto = aplicarMapeamento(linha, mapeamento);

      // Preço vem como texto do CSV ("10,50", "R$ 10,50"...) — nunca aceito
      // como número "na sorte": se não parsear, a linha é invalida, nunca
      // vira 0 ou um valor inventado.
      const dadosParaValidar: Record<string, unknown> = { ...bruto };
      if (bruto.preco !== undefined) {
        const precoNumero = parseNumeroBr(bruto.preco);
        if (precoNumero === null) {
          invalidos.push({ linha: numeroLinha, motivo: `Preço "${bruto.preco}" não é um número válido.` });
          return;
        }
        dadosParaValidar.preco = precoNumero;
      }

      if (bruto.nome === undefined) {
        invalidos.push({ linha: numeroLinha, motivo: 'Coluna "Nome" vazia ou não mapeada.' });
        return;
      }
      if (bruto.preco === undefined) {
        invalidos.push({ linha: numeroLinha, motivo: 'Coluna "Preço" vazia ou não mapeada.' });
        return;
      }

      const candidato = produtoCreateSchema.safeParse(dadosParaValidar);
      if (!candidato.success) {
        invalidos.push({ linha: numeroLinha, motivo: candidato.error.issues[0].message });
        return;
      }

      const nome = candidato.data.nome.toLowerCase();
      const sku = candidato.data.sku?.toLowerCase();
      const jaExisteNoCadastro = nomesExistentes.has(nome) || (sku && skusExistentes.has(sku));
      const jaExisteNesteArquivo = nomesNesteArquivo.has(nome) || (sku && skusNesteArquivo.has(sku));

      if ((jaExisteNoCadastro || jaExisteNesteArquivo) && !importarDuplicados) {
        duplicados.push({
          linha: numeroLinha,
          motivo: jaExisteNoCadastro ? "Já existe um produto com este nome ou SKU." : "Duplicado dentro do próprio arquivo.",
        });
        return;
      }

      nomesNesteArquivo.add(nome);
      if (sku) skusNesteArquivo.add(sku);
      paraCriar.push(candidato.data);
    });

    if (paraCriar.length > 0) {
      const planoEfetivoAtual = await planoEfetivo(empresa);
      const config = await obterConfigPlano(planoEfetivoAtual);
      if (config.limiteProdutos !== null) {
        const contagemAtual = await prisma.produto.count({ where: { empresaId } });
        if (contagemAtual + paraCriar.length > config.limiteProdutos) {
          return res.status(403).json({
            erro: `Seu plano permite até ${config.limiteProdutos} produtos. Você tem ${contagemAtual} e esta importação adicionaria ${paraCriar.length} — reduza o arquivo ou libere espaço antes de importar.`,
            codigo: "LIMITE_PLANO",
          });
        }
      }
    }

    let criados = 0;
    for (const dados of paraCriar) {
      const produto = await prisma.produto.create({ data: { ...dados, empresaId } });
      criados++;
      registrarEvento({
        empresaId,
        tipo: "PRODUTO_CRIADO",
        entidadeTipo: "Produto",
        entidadeId: produto.id,
        descricao: `Produto "${produto.nome}" importado via CSV.`,
      }).catch((e) => console.error("Erro ao registrar histórico:", e));
    }

    return res.json({ criados, duplicados: duplicados.length, invalidos, detalheDuplicados: duplicados });
  } catch (erro) {
    if (erro instanceof ArquivoImportacaoError) {
      return res.status(400).json({ erro: erro.message });
    }
    console.error("Erro ao confirmar importação de produtos:", erro);
    return res.status(500).json({ erro: "Não foi possível concluir a importação." });
  }
});

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

    registrarEvento({
      empresaId: req.usuario!.empresaId,
      tipo: "PRODUTO_CRIADO",
      entidadeTipo: "Produto",
      entidadeId: produto.id,
      descricao: `Produto "${produto.nome}" cadastrado.`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

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

// Substitui TODAS as variações de um produto de uma vez (mesmo padrão de
// /campos e /kit: apaga e recria numa transação). Variações existentes que
// já têm estoque/movimentações são identificadas apenas por nome+sku no
// corpo — recriar a lista NÃO apaga o estoque de uma variação cujo nome
// permaneça o mesmo, mas renomear efetivamente cria uma variação nova e
// "abandona" o estoque da antiga sob o id antigo (mesma limitação que já
// existe em /campos: não há diffing por id, é substituição completa).
router.put("/:id/variacoes", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });

  const resultado = variacoesUpdateSchema.safeParse(req.body);
  if (!resultado.success) return res.status(400).json({ erro: resultado.error.issues[0].message });

  const empresaId = req.usuario!.empresaId;

  try {
    const produto = await prisma.produto.findFirst({ where: { id: idResultado.data, empresaId } });
    if (!produto) return res.status(404).json({ erro: "Produto não encontrado." });
    if (produto.tipoProduto === "KIT") {
      return res.status(400).json({ erro: "Um kit não pode ter variações — variações são só para produtos simples." });
    }

    const nomesRepetidos = new Set<string>();
    for (const v of resultado.data.variacoes) {
      const chave = v.nome.trim().toLowerCase();
      if (nomesRepetidos.has(chave)) {
        return res.status(400).json({ erro: `O nome de variação "${v.nome}" está repetido.` });
      }
      nomesRepetidos.add(chave);
    }

    // Variações que já têm estoque ou movimentação registrada não podem ser
    // apagadas silenciosamente (perderia histórico e saldo real) — só podem
    // ser desativadas (ativa=false). Detecta isso comparando o conjunto atual
    // com o que está sendo salvo.
    const existentes = await prisma.produtoVariacao.findMany({
      where: { produtoId: produto.id },
      select: { id: true, nome: true, _count: { select: { estoqueLocais: true, movimentacoes: true } } },
    });
    const nomesNovos = new Set(resultado.data.variacoes.map((v) => v.nome.trim().toLowerCase()));
    const removeriaComHistorico = existentes.find(
      (v) => !nomesNovos.has(v.nome.trim().toLowerCase()) && (v._count.estoqueLocais > 0 || v._count.movimentacoes > 0)
    );
    if (removeriaComHistorico) {
      return res.status(409).json({
        erro: `A variação "${removeriaComHistorico.nome}" já tem estoque ou movimentações — para não perder o histórico, desative-a em vez de removê-la (marque "ativa": false).`,
      });
    }

    await prisma.$transaction(async (tx) => {
      // Só apaga variações que NÃO têm estoque/movimentação (validado acima);
      // as demais precisam ter sido incluídas de novo no corpo (senão o passo
      // anterior já teria bloqueado a requisição).
      const idsParaManter = existentes.filter((v) => nomesNovos.has(v.nome.trim().toLowerCase())).map((v) => v.id);
      await tx.produtoVariacao.deleteMany({ where: { produtoId: produto.id, id: { notIn: idsParaManter } } });

      for (const variacao of resultado.data.variacoes) {
        const existente = existentes.find((v) => v.nome.trim().toLowerCase() === variacao.nome.trim().toLowerCase());
        if (existente) {
          await tx.produtoVariacao.update({
            where: { id: existente.id },
            data: {
              nome: variacao.nome,
              sku: variacao.sku ?? null,
              codigoBarras: variacao.codigoBarras ?? null,
              precoAdicional: variacao.precoAdicional,
              ativa: variacao.ativa,
            },
          });
        } else {
          await tx.produtoVariacao.create({
            data: {
              produtoId: produto.id,
              nome: variacao.nome,
              sku: variacao.sku ?? null,
              codigoBarras: variacao.codigoBarras ?? null,
              precoAdicional: variacao.precoAdicional,
              ativa: variacao.ativa,
            },
          });
        }
      }
    });

    const produtoAtualizado = await prisma.produto.findFirst({
      where: { id: idResultado.data, empresaId },
      include: includeCampos,
    });
    return res.json(produtoAtualizado);
  } catch (erro) {
    console.error("Erro ao atualizar variações do produto:", erro);
    return res.status(500).json({ erro: "Não foi possível atualizar as variações do produto." });
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
