// Integração real com a WhatsApp Business Cloud API (Meta). Sem
// WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID configurados neste
// ambiente, o envio retorna erro controlado — nunca simula um envio
// bem-sucedido que não aconteceu de verdade.

import crypto from "crypto";

function obterCredenciais(): { accessToken: string; phoneNumberId: string } {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) {
    throw new Error(
      "Integração com WhatsApp não configurada — defina WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID no .env."
    );
  }
  return { accessToken, phoneNumberId };
}

export function whatsappConfigurado(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Envia uma mensagem de texto via WhatsApp Business Cloud API. */
export async function enviarMensagemTexto(paraTelefone: string, texto: string): Promise<void> {
  const { accessToken, phoneNumberId } = obterCredenciais();

  const resposta = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: paraTelefone,
      type: "text",
      text: { body: texto },
    }),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(`Falha ao enviar mensagem via WhatsApp (status ${resposta.status}): ${corpo}`);
  }
}

/**
 * Valida a assinatura HMAC-SHA256 que a Meta envia no header
 * `X-Hub-Signature-256` de todo webhook (formato `sha256=<hex>`), calculada
 * sobre os bytes exatos do corpo recebido usando o App Secret do app da
 * Meta. Sem isso, qualquer POST bem formado seria aceito como se viesse do
 * WhatsApp de verdade — comparação em tempo constante para não vazar
 * informação por timing. Retorna false (nunca lança) para qualquer entrada
 * inesperada; o chamador trata "não validado" como "rejeitar", sempre.
 */
export function validarAssinaturaWebhookWhatsApp(rawBody: Buffer | undefined, assinaturaHeader: string | undefined): boolean {
  const segredo = process.env.WHATSAPP_APP_SECRET;
  if (!segredo || !rawBody || !assinaturaHeader) return false;

  const [algoritmo, hashRecebido] = assinaturaHeader.split("=");
  if (algoritmo !== "sha256" || !hashRecebido) return false;

  const hashCalculado = crypto.createHmac("sha256", segredo).update(rawBody).digest("hex");

  const bufferCalculado = Buffer.from(hashCalculado, "hex");
  const bufferRecebido = Buffer.from(hashRecebido, "hex");
  if (bufferCalculado.length !== bufferRecebido.length) return false;
  return crypto.timingSafeEqual(bufferCalculado, bufferRecebido);
}
