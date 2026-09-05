/**
 * Envio de e-mail transacional (hoje: só recuperação de senha). Usa a API
 * HTTP da Resend diretamente (mesmo padrão de `fetch` cru já usado para
 * OpenAI/Anthropic — sem SDK extra) para não adicionar uma dependência nova
 * só por causa disto.
 *
 * O MOVA nunca teve infraestrutura de e-mail antes desta etapa. Em vez de
 * inventar uma integração "funcionando" sem credenciais reais, o
 * comportamento é explícito:
 * - Sem RESEND_API_KEY/EMAIL_REMETENTE configurados em desenvolvimento: o
 *   conteúdo do e-mail (incluindo qualquer link de ação) vai só para o log
 *   do servidor — nunca finge que um e-mail de verdade foi enviado.
 * - Sem configuração em produção: lança erro explícito (mesmo padrão de
 *   `iaConfigurada()`/`whatsappConfigurado()`), nunca falha silenciosamente.
 */

const RESEND_API_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

// Qualquer dado vindo do usuário (ex.: nome do usuário) interpolado no HTML
// do e-mail precisa passar por aqui primeiro — nunca confiar que um campo já
// validado para outro propósito (comprimento, por exemplo) é seguro para
// virar HTML sem escapar.
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE);
}

interface EnvioEmail {
  para: string;
  assunto: string;
  textoSimples: string;
  textoHtml: string;
}

export async function enviarEmail(dados: EnvioEmail): Promise<void> {
  if (!emailConfigurado()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Envio de e-mail não configurado neste ambiente (RESEND_API_KEY/EMAIL_REMETENTE ausentes).");
    }
    console.log(`[email:DEV — sem provedor configurado] Para: ${dados.para} | Assunto: ${dados.assunto}\n${dados.textoSimples}`);
    return;
  }

  const controlador = new AbortController();
  const timeout = setTimeout(() => controlador.abort(), TIMEOUT_MS);
  try {
    const resposta = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_REMETENTE,
        to: dados.para,
        subject: dados.assunto,
        text: dados.textoSimples,
        html: dados.textoHtml,
      }),
      signal: controlador.signal,
    });
    if (!resposta.ok) {
      throw new Error(`Provedor de e-mail retornou status ${resposta.status}.`);
    }
  } finally {
    clearTimeout(timeout);
  }
}
