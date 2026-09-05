import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { idParamSchema } from "../schemas/common.schema";
import {
  orcamentoCreateSchema,
  statusUpdateSchema,
  etapaOrcamentoUpdateSchema,
  ItemInput,
} from "../schemas/orcamento.schema";
import { mensagemLimiteExcedido, verificarLimite } from "../lib/planos";
import { validarIndicacaoSeElegivel } from "../lib/indicacao";
import { registrarEvento } from "../lib/historico";

const router = Router();

router.use(autenticar);

export interface ItemPreparado {
  produtoId: string;
  nome: string;
  quantidade: Prisma.Decimal;
  precoUnitario: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  detalhes: Array<{ nome: string; valor: string }>;
}

type ProdutoComCampos = Prisma.ProdutoGetPayload<{
  include: { campos: { include: { opcoes: true } } };
}>;

/**
 * Resolve os valores enviados pelo cliente para os campos configuráveis do
 * produto (largura, material, etc.) em pares { nome, valor } prontos para
 * exibição — validando cada um contra a definição real do campo (nunca
 * confiando em rótulo/opção vindo do frontend).
 */
function resolverDetalhesItem(
  produto: ProdutoComCampos,
  valoresCampos: ItemInput["valoresCampos"]
): { detalhes: Array<{ nome: string; valor: string }> } | { erro: string } {
  const valoresPorCampo = new Map((valoresCampos ?? []).map((v) => [v.campoId, v.valor]));
  const detalhes: Array<{ nome: string; valor: string }> = [];

  for (const campo of produto.campos) {
    const valorBruto = valoresPorCampo.get(campo.id);

    if (valorBruto === undefined) {
      if (campo.obrigatorio) {
        return { erro: `Preencha o campo "${campo.nome}" de "${produto.nome}".` };
      }
      continue;
    }

    if (campo.tipo === "TEXTO") {
      if (typeof valorBruto !== "string") {
        return { erro: `Valor inválido para o campo "${campo.nome}".` };
      }
      detalhes.push({ nome: campo.nome, valor: valorBruto.trim() });
    } else if (campo.tipo === "NUMERO") {
      if (typeof valorBruto !== "string") {
        return { erro: `Valor inválido para o campo "${campo.nome}".` };
      }
      const numero = Number(valorBruto);
      if (!Number.isFinite(numero)) {
        return { erro: `O campo "${campo.nome}" deve ser um número.` };
      }
      detalhes.push({ nome: campo.nome, valor: campo.unidade ? `${numero} ${campo.unidade}` : String(numero) });
    } else if (campo.tipo === "SELECAO_UNICA") {
      if (typeof valorBruto !== "string") {
        return { erro: `Selecione uma opção para o campo "${campo.nome}".` };
      }
      const opcao = campo.opcoes.find((o) => o.id === valorBruto);
      if (!opcao) {
        return { erro: `Opção inválida para o campo "${campo.nome}".` };
      }
      detalhes.push({ nome: campo.nome, valor: opcao.rotulo });
    } else if (campo.tipo === "SELECAO_MULTIPLA") {
      if (!Array.isArray(valorBruto)) {
        return { erro: `Selecione ao menos uma opção para o campo "${campo.nome}".` };
      }
      const rotulos: string[] = [];
      for (const opcaoId of valorBruto) {
        const opcao = campo.opcoes.find((o) => o.id === opcaoId);
        if (!opcao) {
          return { erro: `Opção inválida para o campo "${campo.nome}".` };
        }
        rotulos.push(opcao.rotulo);
      }
      if (rotulos.length > 0) {
        detalhes.push({ nome: campo.nome, valor: rotulos.join(", ") });
      }
    } else if (campo.tipo === "DATA") {
      if (typeof valorBruto !== "string" || Number.isNaN(Date.parse(valorBruto))) {
        return { erro: `Informe uma data válida para o campo "${campo.nome}".` };
      }
      detalhes.push({ nome: campo.nome, valor: new Date(valorBruto).toLocaleDateString("pt-BR", { timeZone: "UTC" }) });
    } else if (campo.tipo === "BOOLEANO") {
      if (valorBruto !== "Sim" && valorBruto !== "Não") {
        return { erro: `Valor inválido para o campo "${campo.nome}".` };
      }
      detalhes.push({ nome: campo.nome, valor: valorBruto });
    }
  }

  return { detalhes };
}

export async function prepararItens(
  empresaId: string,
  itensInput: ItemInput[]
): Promise<{ itens: ItemPreparado[] } | { erro: string }> {
  const produtoIds = [...new Set(itensInput.map((item) => item.produtoId))];

  const produtos = await prisma.produto.findMany({
    where: { id: { in: produtoIds }, empresaId },
    include: { campos: { include: { opcoes: true } } },
  });
  const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]));

  const itens: ItemPreparado[] = [];

  for (const item of itensInput) {
    const produto = produtosPorId.get(item.produtoId);

    if (!produto || !produto.ativo) {
      return { erro: "Um ou mais produtos/serviços selecionados não estão disponíveis." };
    }

    const resultadoDetalhes = resolverDetalhesItem(produto, item.valoresCampos);
    if ("erro" in resultadoDetalhes) {
      return { erro: resultadoDetalhes.erro };
    }

    const precoUnitario =
      item.precoUnitario !== undefined ? new Prisma.Decimal(item.precoUnitario) : produto.preco;
    const quantidade = new Prisma.Decimal(item.quantidade);
    const subtotal = quantidade.times(precoUnitario).toDecimalPlaces(2);

    itens.push({
      produtoId: produto.id,
      nome: item.nome ?? produto.nome,
      quantidade,
      precoUnitario,
      subtotal,
      detalhes: resultadoDetalhes.detalhes,
    });
  }

  return { itens };
}

export function calcularTotais(itens: ItemPreparado[], descontoInput: number | undefined) {
  const subtotal = itens.reduce(
    (acc, item) => acc.plus(item.subtotal),
    new Prisma.Decimal(0)
  );
  const desconto = new Prisma.Decimal(descontoInput ?? 0).toDecimalPlaces(2);

  if (desconto.greaterThan(subtotal)) {
    return { erro: "Desconto não pode ser maior que o subtotal." };
  }

  const total = subtotal.minus(desconto);

  return { subtotal, desconto, total };
}

router.post("/", async (req, res) => {
  const resultado = orcamentoCreateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  const empresaId = req.usuario!.empresaId;
  const { clienteId, validade, observacoes, desconto, itens } = resultado.data;

  try {
    const empresa = await prisma.empresa.findUniqueOrThrow({
      where: { id: empresaId },
      select: { id: true, planoTipo: true, trialBonusAteEm: true },
    });
    const limiteExcedido = await verificarLimite(empresa, "orcamentos");
    if (limiteExcedido) {
      return res.status(403).json({ erro: mensagemLimiteExcedido(limiteExcedido), codigo: "LIMITE_PLANO", ...limiteExcedido });
    }

    const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, empresaId } });
    if (!cliente) {
      return res.status(404).json({ erro: "Cliente não encontrado." });
    }

    const preparo = await prepararItens(empresaId, itens);
    if ("erro" in preparo) {
      return res.status(400).json({ erro: preparo.erro });
    }

    const totais = calcularTotais(preparo.itens, desconto);
    if ("erro" in totais) {
      return res.status(400).json({ erro: totais.erro });
    }

    const orcamento = await prisma.orcamento.create({
      data: {
        empresaId,
        clienteId,
        validade,
        observacoes,
        subtotal: totais.subtotal,
        desconto: totais.desconto,
        total: totais.total,
        itens: {
          create: preparo.itens.map((item) => ({
            produtoId: item.produtoId,
            nome: item.nome,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            subtotal: item.subtotal,
            detalhes: item.detalhes.length > 0 ? item.detalhes : undefined,
          })),
        },
      },
      include: { itens: true, cliente: { select: { id: true, nome: true } }, etapaProcesso: true },
    });

    registrarEvento({
      empresaId,
      tipo: "ORCAMENTO_CRIADO",
      entidadeTipo: "Orcamento",
      entidadeId: orcamento.id,
      descricao: `Orçamento #${orcamento.numero} criado para ${orcamento.cliente.nome}, total ${orcamento.total.toString()}.`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    // Espera a validação terminar (é rápida: 1-2 queries indexadas na
    // maioria das vezes, pois só faz algo quando há indicação PENDENTE) para
    // que o estado fique consistente assim que a resposta chega ao cliente.
    // Erro aqui nunca derruba a criação do orçamento, que já foi concluída.
    try {
      await validarIndicacaoSeElegivel(empresaId);
    } catch (erroIndicacao) {
      console.error("Erro ao validar indicação após criar orçamento:", erroIndicacao);
    }

    return res.status(201).json(orcamento);
  } catch (erro) {
    console.error("Erro ao criar orçamento:", erro);
    return res.status(500).json({ erro: "Não foi possível criar o orçamento." });
  }
});

router.get("/", async (req, res) => {
  const statusValidos = ["RASCUNHO", "ENVIADO", "APROVADO", "RECUSADO"];
  const filtroStatus =
    typeof req.query.status === "string" && statusValidos.includes(req.query.status)
      ? (req.query.status as "RASCUNHO" | "ENVIADO" | "APROVADO" | "RECUSADO")
      : undefined;

  try {
    const orcamentos = await prisma.orcamento.findMany({
      where: {
        empresaId: req.usuario!.empresaId,
        ...(filtroStatus ? { status: filtroStatus } : {}),
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        etapaProcesso: true,
        _count: { select: { itens: true } },
      },
      orderBy: { numero: "desc" },
    });
    return res.json(orcamentos);
  } catch (erro) {
    console.error("Erro ao listar orçamentos:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar os orçamentos." });
  }
});

router.get("/resumo", async (req, res) => {
  const empresaId = req.usuario!.empresaId;

  try {
    const [porStatus, agregados, atividadesRecentes] = await Promise.all([
      prisma.orcamento.groupBy({
        by: ["status"],
        where: { empresaId },
        _count: { _all: true },
      }),
      prisma.orcamento.aggregate({
        where: { empresaId },
        _count: { _all: true },
        _sum: { total: true },
      }),
      prisma.orcamento.findMany({
        where: { empresaId },
        orderBy: { atualizadoEm: "desc" },
        take: 5,
        select: {
          id: true,
          numero: true,
          status: true,
          total: true,
          atualizadoEm: true,
          cliente: { select: { id: true, nome: true } },
        },
      }),
    ]);

    const contagemPorStatus: Record<string, number> = {};
    for (const item of porStatus) {
      contagemPorStatus[item.status] = item._count._all;
    }

    const pendentes = (contagemPorStatus.RASCUNHO ?? 0) + (contagemPorStatus.ENVIADO ?? 0);
    const aprovados = contagemPorStatus.APROVADO ?? 0;

    return res.json({
      totalOrcamentos: agregados._count._all,
      pendentes,
      aprovados,
      valorTotal: agregados._sum.total ?? new Prisma.Decimal(0),
      atividadesRecentes,
    });
  } catch (erro) {
    console.error("Erro ao carregar resumo de orçamentos:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar o resumo dos orçamentos." });
  }
});

router.get("/:id", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  try {
    const orcamento = await prisma.orcamento.findFirst({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
      include: { itens: true, cliente: true, etapaProcesso: true },
    });

    if (!orcamento) {
      return res.status(404).json({ erro: "Orçamento não encontrado." });
    }

    return res.json(orcamento);
  } catch (erro) {
    console.error("Erro ao buscar orçamento:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar o orçamento." });
  }
});

router.put("/:id", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  const resultado = orcamentoCreateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  const empresaId = req.usuario!.empresaId;
  const { clienteId, validade, observacoes, desconto, itens } = resultado.data;

  try {
    const orcamentoExistente = await prisma.orcamento.findFirst({
      where: { id: idResultado.data, empresaId },
    });

    if (!orcamentoExistente) {
      return res.status(404).json({ erro: "Orçamento não encontrado." });
    }

    if (orcamentoExistente.status === "APROVADO" || orcamentoExistente.status === "RECUSADO") {
      return res.status(409).json({
        erro: "Não é possível editar um orçamento já aprovado ou recusado.",
      });
    }

    const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, empresaId } });
    if (!cliente) {
      return res.status(404).json({ erro: "Cliente não encontrado." });
    }

    const preparo = await prepararItens(empresaId, itens);
    if ("erro" in preparo) {
      return res.status(400).json({ erro: preparo.erro });
    }

    const totais = calcularTotais(preparo.itens, desconto);
    if ("erro" in totais) {
      return res.status(400).json({ erro: totais.erro });
    }

    await prisma.$transaction([
      prisma.itemOrcamento.deleteMany({ where: { orcamentoId: idResultado.data } }),
      prisma.orcamento.update({
        where: { id: idResultado.data },
        data: {
          clienteId,
          validade,
          observacoes,
          subtotal: totais.subtotal,
          desconto: totais.desconto,
          total: totais.total,
          itens: {
            create: preparo.itens.map((item) => ({
              produtoId: item.produtoId,
              nome: item.nome,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              subtotal: item.subtotal,
              detalhes: item.detalhes.length > 0 ? item.detalhes : undefined,
            })),
          },
        },
      }),
    ]);

    const orcamentoAtualizado = await prisma.orcamento.findFirst({
      where: { id: idResultado.data, empresaId },
      include: { itens: true, cliente: { select: { id: true, nome: true } }, etapaProcesso: true },
    });

    return res.json(orcamentoAtualizado);
  } catch (erro) {
    console.error("Erro ao atualizar orçamento:", erro);
    return res.status(500).json({ erro: "Não foi possível atualizar o orçamento." });
  }
});

router.patch("/:id/status", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  const resultado = statusUpdateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  try {
    const atualizacao = await prisma.orcamento.updateMany({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
      data: { status: resultado.data.status },
    });

    if (atualizacao.count === 0) {
      return res.status(404).json({ erro: "Orçamento não encontrado." });
    }

    const orcamento = await prisma.orcamento.findFirst({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
      include: { itens: true, cliente: { select: { id: true, nome: true } }, etapaProcesso: true },
    });

    if (orcamento) {
      const rotuloStatus: Record<string, string> = {
        RASCUNHO: "voltou para rascunho",
        ENVIADO: "enviado ao cliente",
        APROVADO: "aprovado",
        RECUSADO: "recusado",
      };
      registrarEvento({
        empresaId: req.usuario!.empresaId,
        tipo: `ORCAMENTO_${resultado.data.status}`,
        entidadeTipo: "Orcamento",
        entidadeId: orcamento.id,
        descricao: `Orçamento #${orcamento.numero} ${rotuloStatus[resultado.data.status] ?? resultado.data.status.toLowerCase()}.`,
      }).catch((e) => console.error("Erro ao registrar histórico:", e));
    }

    return res.json(orcamento);
  } catch (erro) {
    console.error("Erro ao atualizar status do orçamento:", erro);
    return res.status(500).json({ erro: "Não foi possível atualizar o status do orçamento." });
  }
});

// Etapa do processo configurável (Etapa 2) — camada de rótulo opcional, não
// mexe no status técnico. Só existe para empresas que configuraram um
// processo em Configurações; nada muda para quem não configurou nada.
router.patch("/:id/etapa", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  const resultado = etapaOrcamentoUpdateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  const empresaId = req.usuario!.empresaId;

  try {
    const orcamento = await prisma.orcamento.findFirst({ where: { id: idResultado.data, empresaId } });
    if (!orcamento) {
      return res.status(404).json({ erro: "Orçamento não encontrado." });
    }

    if (resultado.data.etapaProcessoId !== null) {
      // A etapa precisa ser da própria empresa (via ProcessoConfig) e
      // representar o MESMO status técnico do orçamento — a camada de
      // configuração nunca pode contradizer o status real.
      const etapa = await prisma.etapaProcesso.findFirst({
        where: { id: resultado.data.etapaProcessoId, processoConfig: { empresaId } },
      });

      if (!etapa) {
        return res.status(404).json({ erro: "Etapa não encontrada." });
      }

      if (etapa.statusBase !== orcamento.status) {
        return res.status(409).json({
          erro: `Essa etapa é para orçamentos "${etapa.statusBase}", mas este orçamento está "${orcamento.status}".`,
        });
      }
    }

    const orcamentoAtualizado = await prisma.orcamento.update({
      where: { id: idResultado.data },
      data: { etapaProcessoId: resultado.data.etapaProcessoId },
      include: { itens: true, cliente: { select: { id: true, nome: true } }, etapaProcesso: true },
    });

    return res.json(orcamentoAtualizado);
  } catch (erro) {
    console.error("Erro ao atualizar etapa do orçamento:", erro);
    return res.status(500).json({ erro: "Não foi possível atualizar a etapa do orçamento." });
  }
});

router.delete("/:id", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  try {
    const remocao = await prisma.orcamento.deleteMany({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
    });

    if (remocao.count === 0) {
      return res.status(404).json({ erro: "Orçamento não encontrado." });
    }

    return res.status(204).send();
  } catch (erro) {
    console.error("Erro ao excluir orçamento:", erro);
    return res.status(500).json({ erro: "Não foi possível excluir o orçamento." });
  }
});

export default router;
