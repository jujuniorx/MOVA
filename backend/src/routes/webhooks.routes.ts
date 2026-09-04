import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { validarAssinaturaWebhook, buscarAssinaturaMercadoPago } from "../lib/mercadoPago";
import { mapearStatusMercadoPago, aplicarStatusAssinatura } from "../lib/assinaturas";

const router = Router();

// Notificações legítimas do Mercado Pago podem chegar em rajada (várias
// mudanças de status seguidas) — limite generoso, mas ainda existente para
// não virar um vetor de abuso caso a URL vaze.
const limiteWebhook = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas requisições." },
});

router.post("/mercado-pago", limiteWebhook, async (req, res) => {
  const segredo = process.env.MP_WEBHOOK_SECRET;
  if (!segredo) {
    console.error("MP_WEBHOOK_SECRET não configurado — webhook rejeitado por segurança.");
    return res.status(503).send();
  }

  // O Mercado Pago manda o tipo e o id do recurso tanto na query quanto no
  // corpo, dependendo da versão/configuração do webhook — aceitamos os dois
  // formatos, mas NUNCA usamos nada além do id para decidir o que aconteceu:
  // o status em si é sempre reconsultado direto na API deles.
  const tipo = (req.query.type as string | undefined) ?? (req.body?.type as string | undefined) ?? (req.body?.topic as string | undefined);
  const dataId =
    (req.query["data.id"] as string | undefined) ??
    (req.body?.data?.id as string | undefined) ??
    (req.body?.id as string | undefined);

  const assinaturaValida = validarAssinaturaWebhook({
    xSignature: req.headers["x-signature"] as string | undefined,
    xRequestId: req.headers["x-request-id"] as string | undefined,
    dataId,
    segredo,
  });

  if (!assinaturaValida) {
    console.error("Webhook do Mercado Pago com assinatura inválida — rejeitado.");
    return res.status(401).send();
  }

  // Só nos interessam eventos de assinatura recorrente (preapproval). Outros
  // tópicos (ex.: "payment" avulso) são confirmados com 200 e ignorados —
  // devolver erro para algo que não vamos processar só causaria retentativas
  // inúteis do lado do Mercado Pago.
  if (tipo !== "subscription_preapproval" && tipo !== "preapproval") {
    return res.status(200).send();
  }

  if (!dataId) {
    return res.status(400).send();
  }

  try {
    // Fonte de verdade real: sempre a API do Mercado Pago, nunca o corpo do
    // webhook em si (que pode estar incompleto ou, em teoria, ser replayed).
    const preapprovalAtual = await buscarAssinaturaMercadoPago(dataId);

    const assinatura = await prisma.assinatura.findUnique({
      where: { mercadoPagoPreapprovalId: dataId },
    });

    if (!assinatura) {
      // Pode ser uma corrida entre o webhook chegar e nossa própria escrita
      // do preapprovalId ainda não ter commitado — pedimos para o Mercado
      // Pago tentar de novo mais tarde em vez de descartar o evento.
      console.error(`Webhook: nenhuma assinatura local encontrada para preapproval ${dataId}.`);
      return res.status(404).send();
    }

    const novoStatus = mapearStatusMercadoPago(preapprovalAtual.status);
    const chaveIdempotencia = `${dataId}:${preapprovalAtual.status}`;

    const resultado = await aplicarStatusAssinatura({
      assinaturaId: assinatura.id,
      novoStatus,
      planoTipo: assinatura.planoTipo,
      cicloFaturamento: assinatura.cicloFaturamento,
      proximaCobranca: preapprovalAtual.next_payment_date ? new Date(preapprovalAtual.next_payment_date) : null,
      chaveIdempotencia,
      tipoEvento: tipo,
      statusRecebidoCru: preapprovalAtual.status,
      payload: { preapprovalId: dataId, status: preapprovalAtual.status },
    });

    if (!resultado.aplicado) {
      console.log(`Webhook: evento ${chaveIdempotencia} já havia sido processado (idempotência).`);
    }

    return res.status(200).send();
  } catch (erro) {
    console.error("Erro ao processar webhook do Mercado Pago:", erro);
    // 5xx sinaliza ao Mercado Pago para tentar de novo mais tarde — não
    // queremos "engolir" um evento de pagamento por um erro transitório
    // nosso (ex.: banco temporariamente indisponível).
    return res.status(500).send();
  }
});

export default router;
