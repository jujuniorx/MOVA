import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { checkoutSchema } from "../schemas/assinatura.schema";
import { obterConfigPlano } from "../lib/planos";
import { criarAssinaturaMercadoPago, cancelarAssinaturaMercadoPago } from "../lib/mercadoPago";
import { frontendUrlPrincipal } from "../lib/config";

const router = Router();

router.use(autenticar);

// Criação de checkout é uma ação "cara" (chama uma API externa) e sensível o
// bastante para merecer limite próprio, mais apertado que o geral da API.
const limiteCheckout = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Tente novamente em alguns minutos." },
});

router.get("/minha", async (req, res) => {
  try {
    const assinatura = await prisma.assinatura.findUnique({
      where: { empresaId: req.usuario!.empresaId },
      select: {
        planoTipo: true,
        cicloFaturamento: true,
        status: true,
        iniciadaEm: true,
        proximaCobranca: true,
        canceladaEm: true,
      },
    });
    return res.json(assinatura);
  } catch (erro) {
    console.error("Erro ao buscar assinatura:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar sua assinatura." });
  }
});

router.post("/checkout", limiteCheckout, async (req, res) => {
  const resultado = checkoutSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  if (!process.env.MP_ACCESS_TOKEN) {
    return res.status(503).json({
      erro: "A cobrança por cartão ainda não está configurada neste ambiente. Fale com o suporte.",
    });
  }

  const empresaId = req.usuario!.empresaId;
  const { planoTipo, cicloFaturamento } = resultado.data;

  try {
    // O preço nunca vem do cliente — é sempre lido do PlanoConfig, a fonte
    // de verdade única de preço, aqui e em todo o resto do backend.
    const config = await obterConfigPlano(planoTipo);
    const valorCobranca = Number(cicloFaturamento === "ANUAL" ? config.precoAnual : config.precoMensal);
    const frequenciaMeses = cicloFaturamento === "ANUAL" ? 12 : 1;

    const assinaturaExistente = await prisma.assinatura.findUnique({ where: { empresaId } });

    // Trocar de plano (upgrade/downgrade) ou tentar de novo um checkout que
    // ficou pendente: cancela a tentativa anterior no Mercado Pago antes de
    // criar a nova, para nunca deixar duas assinaturas cobrando ao mesmo
    // tempo. Falha ao cancelar a antiga não impede seguir — o webhook da
    // antiga, se chegar depois, só vai reafirmar CANCELADA/EXPIRADA nela.
    if (assinaturaExistente?.mercadoPagoPreapprovalId && assinaturaExistente.status !== "CANCELADA") {
      try {
        await cancelarAssinaturaMercadoPago(assinaturaExistente.mercadoPagoPreapprovalId);
      } catch (erroCancelamento) {
        console.error("Aviso: falha ao cancelar assinatura anterior no Mercado Pago:", erroCancelamento);
      }
    }

    const assinatura = await prisma.assinatura.upsert({
      where: { empresaId },
      create: { empresaId, planoTipo, cicloFaturamento, status: "PENDENTE", payerEmail: req.usuario!.email },
      update: { planoTipo, cicloFaturamento, status: "PENDENTE", payerEmail: req.usuario!.email },
    });

    const nomesPlano: Record<string, string> = { START: "MOVA Start", BUSINESS: "MOVA Business", PRO: "MOVA Pro" };

    const preapproval = await criarAssinaturaMercadoPago({
      referenciaExterna: assinatura.id,
      planoNome: nomesPlano[planoTipo],
      valorMensalEquivalente: valorCobranca,
      frequenciaMeses,
      payerEmail: req.usuario!.email,
      backUrl: `${frontendUrlPrincipal}/planos`,
    });

    await prisma.assinatura.update({
      where: { id: assinatura.id },
      data: { mercadoPagoPreapprovalId: preapproval.id },
    });

    return res.json({ initPoint: preapproval.init_point });
  } catch (erro) {
    console.error("Erro ao criar checkout de assinatura:", erro);
    return res.status(502).json({ erro: "Não foi possível iniciar o checkout com o Mercado Pago. Tente novamente." });
  }
});

router.post("/cancelar", async (req, res) => {
  const empresaId = req.usuario!.empresaId;

  try {
    const assinatura = await prisma.assinatura.findUnique({ where: { empresaId } });
    if (!assinatura || assinatura.status === "CANCELADA") {
      return res.status(404).json({ erro: "Nenhuma assinatura ativa encontrada." });
    }

    if (assinatura.mercadoPagoPreapprovalId) {
      try {
        await cancelarAssinaturaMercadoPago(assinatura.mercadoPagoPreapprovalId);
      } catch (erroMp) {
        console.error("Erro ao cancelar assinatura no Mercado Pago:", erroMp);
        return res.status(502).json({ erro: "Não foi possível cancelar junto ao Mercado Pago. Tente novamente." });
      }
    }

    await prisma.$transaction([
      prisma.assinatura.update({
        where: { empresaId },
        data: { status: "CANCELADA", canceladaEm: new Date() },
      }),
      prisma.empresa.update({
        where: { id: empresaId },
        data: { planoTipo: "GRATUITO" },
      }),
    ]);

    return res.status(204).send();
  } catch (erro) {
    console.error("Erro ao cancelar assinatura:", erro);
    return res.status(500).json({ erro: "Não foi possível cancelar a assinatura." });
  }
});

export default router;
