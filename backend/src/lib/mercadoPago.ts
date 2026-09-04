import { MercadoPagoConfig, PreApproval } from "mercadopago";
import crypto from "crypto";

function obterAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    throw new Error("MP_ACCESS_TOKEN não configurado no .env — integração com Mercado Pago indisponível.");
  }
  return token;
}

function obterClient(): MercadoPagoConfig {
  return new MercadoPagoConfig({ accessToken: obterAccessToken() });
}

export interface CriarAssinaturaInput {
  /** Nosso próprio ID interno (Assinatura.id) — nunca o do MP. Vai como external_reference. */
  referenciaExterna: string;
  planoNome: string;
  valorMensalEquivalente: number;
  frequenciaMeses: 1 | 12;
  payerEmail: string;
  backUrl: string;
}

export interface AssinaturaMercadoPago {
  id: string;
  status: string;
  init_point?: string;
  payer_email?: string;
  external_reference?: string;
  next_payment_date?: string;
  auto_recurring?: { transaction_amount?: number; frequency?: number; frequency_type?: string };
}

/**
 * Cria uma assinatura recorrente (preapproval) no Mercado Pago. O valor
 * cobrado vem sempre de `valorMensalEquivalente` calculado pelo backend a
 * partir do PlanoConfig — nunca de nada enviado pelo frontend.
 */
export async function criarAssinaturaMercadoPago(input: CriarAssinaturaInput): Promise<AssinaturaMercadoPago> {
  const client = obterClient();
  const preApproval = new PreApproval(client);

  const resultado = await preApproval.create({
    body: {
      reason: `MOVA — ${input.planoNome}`,
      external_reference: input.referenciaExterna,
      payer_email: input.payerEmail,
      back_url: input.backUrl,
      auto_recurring: {
        frequency: input.frequenciaMeses,
        frequency_type: "months",
        transaction_amount: input.valorMensalEquivalente,
        currency_id: "BRL",
      },
      status: "pending",
    },
  });

  return resultado as AssinaturaMercadoPago;
}

/**
 * Busca o estado ATUAL e autoritativo de uma assinatura direto na API do
 * Mercado Pago — nunca confiamos no corpo do webhook para decidir status,
 * só usamos o webhook como "algo mudou, vá conferir".
 */
export async function buscarAssinaturaMercadoPago(preapprovalId: string): Promise<AssinaturaMercadoPago> {
  const client = obterClient();
  const preApproval = new PreApproval(client);
  const resultado = await preApproval.get({ id: preapprovalId });
  return resultado as AssinaturaMercadoPago;
}

export async function cancelarAssinaturaMercadoPago(preapprovalId: string): Promise<void> {
  const client = obterClient();
  const preApproval = new PreApproval(client);
  await preApproval.update({ id: preapprovalId, body: { status: "cancelled" } });
}

/**
 * Valida a assinatura HMAC do webhook do Mercado Pago (header x-signature),
 * conforme o esquema documentado pelo MP: manifest "id:{id};request-id:{reqId};ts:{ts};"
 * assinado com HMAC-SHA256 usando o segredo do webhook. Comparação em tempo
 * constante para não vazar informação por timing.
 *
 * Retorna false (nunca lança) para qualquer formato inesperado — o chamador
 * deve tratar "não validado" como "rejeitar", sempre.
 */
export function validarAssinaturaWebhook(params: {
  xSignature: string | undefined;
  xRequestId: string | undefined;
  dataId: string | undefined;
  segredo: string;
}): boolean {
  const { xSignature, xRequestId, dataId, segredo } = params;
  if (!xSignature || !xRequestId || !dataId) return false;

  const partes = new Map<string, string>();
  for (const parte of xSignature.split(",")) {
    const [chave, valor] = parte.split("=");
    if (chave && valor) partes.set(chave.trim(), valor.trim());
  }
  const ts = partes.get("ts");
  const v1 = partes.get("v1");
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const hashCalculado = crypto.createHmac("sha256", segredo).update(manifest).digest("hex");

  const bufferCalculado = Buffer.from(hashCalculado, "hex");
  const bufferRecebido = Buffer.from(v1, "hex");
  if (bufferCalculado.length !== bufferRecebido.length) return false;
  return crypto.timingSafeEqual(bufferCalculado, bufferRecebido);
}
