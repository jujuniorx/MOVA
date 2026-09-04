// Integração real com a WhatsApp Business Cloud API (Meta). Sem
// WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID configurados neste
// ambiente, o envio retorna erro controlado — nunca simula um envio
// bem-sucedido que não aconteceu de verdade.

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
