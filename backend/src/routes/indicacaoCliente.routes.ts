import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { idParamSchema } from "../schemas/common.schema";
import {
  indicacaoClienteCreateSchema,
  indicacaoClienteUpdateSchema,
  indicacaoClienteConverterSchema,
  indicacaoClienteCancelarSchema,
} from "../schemas/indicacaoCliente.schema";
import { registrarEvento } from "../lib/historico";
import { enviarEmail, escaparHtml } from "../lib/mailer";

const router = Router();

router.use(autenticar);

const includePadrao = {
  indicadorUsuario: { select: { id: true, nome: true, email: true } },
  cliente: { select: { id: true, nome: true } },
  vendaConvertida: { select: { id: true, numero: true, total: true } },
};

const STATUS_VALIDOS = ["PENDENTE", "CONVERTIDA", "CANCELADA"] as const;

router.get("/", async (req, res) => {
  const empresaId = req.usuario!.empresaId;
  const statusBruto = typeof req.query.status === "string" ? req.query.status : undefined;
  if (statusBruto && !STATUS_VALIDOS.includes(statusBruto as (typeof STATUS_VALIDOS)[number])) {
    return res.status(400).json({ erro: "Status inválido." });
  }
  const status = statusBruto as (typeof STATUS_VALIDOS)[number] | undefined;

  try {
    const indicacoes = await prisma.indicacaoCliente.findMany({
      where: { empresaId, ...(status ? { status } : {}) },
      include: includePadrao,
      orderBy: { criadoEm: "desc" },
    });
    return res.json(indicacoes);
  } catch (erro) {
    console.error("Erro ao listar indicações de clientes:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar as indicações." });
  }
});

// Total acumulado por quem indicou — "quanto cada pessoa já rendeu" é a
// pergunta mais comum de quem usa esse tipo de programa (ver seção do
// Glauber no roadmap), então fica pronto aqui em vez de exigir somar linha a
// linha na tela.
router.get("/resumo", async (req, res) => {
  const empresaId = req.usuario!.empresaId;
  try {
    const convertidas = await prisma.indicacaoCliente.findMany({
      where: { empresaId, status: "CONVERTIDA" },
      select: { indicadorNome: true, indicadorUsuarioId: true, valorRecompensa: true, pontuacao: true },
    });

    const porIndicador = new Map<
      string,
      { indicadorNome: string; indicadorUsuarioId: string | null; totalConvertidas: number; totalValor: number; totalPontos: number }
    >();
    for (const item of convertidas) {
      const chave = item.indicadorUsuarioId ?? `nome:${item.indicadorNome.trim().toLowerCase()}`;
      const atual = porIndicador.get(chave) ?? {
        indicadorNome: item.indicadorNome,
        indicadorUsuarioId: item.indicadorUsuarioId,
        totalConvertidas: 0,
        totalValor: 0,
        totalPontos: 0,
      };
      atual.totalConvertidas += 1;
      atual.totalValor += Number(item.valorRecompensa ?? 0);
      atual.totalPontos += item.pontuacao ?? 0;
      porIndicador.set(chave, atual);
    }

    return res.json(Array.from(porIndicador.values()).sort((a, b) => b.totalValor - a.totalValor));
  } catch (erro) {
    console.error("Erro ao calcular resumo de indicações:", erro);
    return res.status(500).json({ erro: "Não foi possível calcular o resumo." });
  }
});

router.get("/:id", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });

  try {
    const indicacao = await prisma.indicacaoCliente.findFirst({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
      include: includePadrao,
    });
    if (!indicacao) return res.status(404).json({ erro: "Indicação não encontrada." });
    return res.json(indicacao);
  } catch (erro) {
    console.error("Erro ao buscar indicação:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar a indicação." });
  }
});

router.post("/", async (req, res) => {
  const resultado = indicacaoClienteCreateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  const empresaId = req.usuario!.empresaId;

  try {
    if (resultado.data.indicadorUsuarioId) {
      const indicador = await prisma.usuario.findFirst({ where: { id: resultado.data.indicadorUsuarioId, empresaId } });
      if (!indicador) return res.status(400).json({ erro: "Usuário indicador não encontrado." });
    }
    if (resultado.data.clienteId) {
      const cliente = await prisma.cliente.findFirst({ where: { id: resultado.data.clienteId, empresaId } });
      if (!cliente) return res.status(400).json({ erro: "Cliente indicado não encontrado." });
    }

    const indicacao = await prisma.indicacaoCliente.create({
      data: { ...resultado.data, empresaId },
      include: includePadrao,
    });

    registrarEvento({
      empresaId,
      tipo: "INDICACAO_CLIENTE_CRIADA",
      entidadeTipo: "IndicacaoCliente",
      entidadeId: indicacao.id,
      descricao: `${indicacao.indicadorNome} indicou ${indicacao.indicadoNome}.`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    return res.status(201).json(indicacao);
  } catch (erro) {
    console.error("Erro ao criar indicação:", erro);
    return res.status(500).json({ erro: "Não foi possível registrar a indicação." });
  }
});

router.patch("/:id", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });

  const resultado = indicacaoClienteUpdateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  const empresaId = req.usuario!.empresaId;

  try {
    const existente = await prisma.indicacaoCliente.findFirst({ where: { id: idResultado.data, empresaId } });
    if (!existente) return res.status(404).json({ erro: "Indicação não encontrada." });

    const indicacao = await prisma.indicacaoCliente.update({
      where: { id: existente.id },
      data: resultado.data,
      include: includePadrao,
    });
    return res.json(indicacao);
  } catch (erro) {
    console.error("Erro ao atualizar indicação:", erro);
    return res.status(500).json({ erro: "Não foi possível atualizar a indicação." });
  }
});

// Notificação best-effort ao indicador quando a indicação converte de
// verdade em venda — só quando "tecnicamente aplicável": precisa ser
// alguém da equipe (indicadorUsuarioId), já que um parceiro/influenciador
// externo não tem conta nem e-mail cadastrado no MOVA. Mesmo padrão de
// "nunca bloqueia a operação principal" do restante do produto (ver
// orcamentoPublico.routes.ts).
async function notificarIndicadorConversao(indicacao: {
  id: string;
  indicadoNome: string;
  indicadorUsuario: { nome: string; email: string } | null;
}): Promise<void> {
  if (!indicacao.indicadorUsuario) return;
  await enviarEmail({
    para: indicacao.indicadorUsuario.email,
    assunto: `Sua indicação de ${indicacao.indicadoNome} virou venda!`,
    textoSimples: `Boa, ${indicacao.indicadorUsuario.nome}! A indicação de ${indicacao.indicadoNome} que você fez virou uma venda de verdade. Obrigado por indicar.`,
    textoHtml: `<p>Boa, ${escaparHtml(indicacao.indicadorUsuario.nome)}! A indicação de <b>${escaparHtml(indicacao.indicadoNome)}</b> que você fez virou uma venda de verdade. Obrigado por indicar.</p>`,
  });
}

router.post("/:id/converter", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });

  const resultado = indicacaoClienteConverterSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  const empresaId = req.usuario!.empresaId;

  try {
    const indicacao = await prisma.indicacaoCliente.findFirst({ where: { id: idResultado.data, empresaId } });
    if (!indicacao) return res.status(404).json({ erro: "Indicação não encontrada." });
    if (indicacao.status !== "PENDENTE") {
      return res.status(409).json({ erro: "Esta indicação já foi convertida ou cancelada." });
    }

    const venda = await prisma.venda.findFirst({ where: { id: resultado.data.vendaId, empresaId } });
    if (!venda) return res.status(400).json({ erro: "Venda não encontrada." });

    // Uso único: a venda não pode já estar vinculada a outra indicação
    // (mesmo padrão de reserva atômica do orçamento→venda: `updateMany` com
    // a condição no WHERE evita duas requisições concorrentes "ganharem" a
    // mesma venda).
    const marcado = await prisma.indicacaoCliente.updateMany({
      where: { id: indicacao.id, status: "PENDENTE" },
      data: { status: "CONVERTIDA", vendaConvertidaId: venda.id, convertidoEm: new Date() },
    });
    if (marcado.count === 0) {
      return res.status(409).json({ erro: "Esta indicação já foi convertida ou cancelada." });
    }

    const atualizada = await prisma.indicacaoCliente.findUniqueOrThrow({ where: { id: indicacao.id }, include: includePadrao });

    registrarEvento({
      empresaId,
      tipo: "INDICACAO_CLIENTE_CONVERTIDA",
      entidadeTipo: "IndicacaoCliente",
      entidadeId: indicacao.id,
      descricao: `Indicação de ${indicacao.indicadoNome} (por ${indicacao.indicadorNome}) virou venda #${venda.numero}.`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    notificarIndicadorConversao(atualizada).catch((e) => console.error("Erro ao notificar indicador sobre conversão:", e));

    return res.json(atualizada);
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return res.status(409).json({ erro: "Esta venda já está vinculada a outra indicação." });
    }
    console.error("Erro ao converter indicação:", erro);
    return res.status(500).json({ erro: "Não foi possível converter a indicação." });
  }
});

router.post("/:id/cancelar", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });

  const resultado = indicacaoClienteCancelarSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  const empresaId = req.usuario!.empresaId;

  try {
    const marcado = await prisma.indicacaoCliente.updateMany({
      where: { id: idResultado.data, empresaId, status: "PENDENTE" },
      data: { status: "CANCELADA", motivoCancelamento: resultado.data.motivo },
    });
    if (marcado.count === 0) {
      return res.status(409).json({ erro: "Indicação não encontrada ou já não está mais pendente." });
    }

    registrarEvento({
      empresaId,
      tipo: "INDICACAO_CLIENTE_CANCELADA",
      entidadeTipo: "IndicacaoCliente",
      entidadeId: idResultado.data,
      descricao: `Indicação cancelada${resultado.data.motivo ? `: "${resultado.data.motivo}"` : "."}`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    return res.status(204).send();
  } catch (erro) {
    console.error("Erro ao cancelar indicação:", erro);
    return res.status(500).json({ erro: "Não foi possível cancelar a indicação." });
  }
});

export default router;
