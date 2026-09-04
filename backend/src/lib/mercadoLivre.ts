// Integração real com o OAuth 2.0 do Mercado Livre, conforme a documentação
// oficial (developers.mercadolivre.com.br). Não há client_id/client_secret
// reais configurados neste ambiente — todas as chamadas que dependem deles
// retornam erro controlado ("não configurado"), nunca simulam sucesso.

const ML_AUTH_BASE = "https://auth.mercadolivre.com.br"; // site Brasil (MLB)
const ML_API_BASE = "https://api.mercadolibre.com";

function obterCredenciais(): { clientId: string; clientSecret: string; redirectUri: string } {
  const clientId = process.env.MERCADO_LIVRE_CLIENT_ID;
  const clientSecret = process.env.MERCADO_LIVRE_CLIENT_SECRET;
  const redirectUri = process.env.MERCADO_LIVRE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Integração com Mercado Livre não configurada — defina MERCADO_LIVRE_CLIENT_ID, MERCADO_LIVRE_CLIENT_SECRET e MERCADO_LIVRE_REDIRECT_URI no .env."
    );
  }
  return { clientId, clientSecret, redirectUri };
}

/** Monta a URL de autorização para redirecionar o usuário (fluxo Authorization Code). */
export function montarUrlAutorizacao(state: string): string {
  const { clientId, redirectUri } = obterCredenciais();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });
  return `${ML_AUTH_BASE}/authorization?${params.toString()}`;
}

export interface TokenMercadoLivre {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
}

/** Troca o `code` recebido no callback por um par access_token/refresh_token. */
export async function trocarCodigoPorToken(code: string): Promise<TokenMercadoLivre> {
  const { clientId, clientSecret, redirectUri } = obterCredenciais();
  const resposta = await fetch(`${ML_API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!resposta.ok) {
    throw new Error(`Falha ao trocar código por token no Mercado Livre (status ${resposta.status}).`);
  }
  return (await resposta.json()) as TokenMercadoLivre;
}

/** Renova o access_token usando o refresh_token — necessário periodicamente (tokens do ML expiram). */
export async function renovarToken(refreshToken: string): Promise<TokenMercadoLivre> {
  const { clientId, clientSecret } = obterCredenciais();
  const resposta = await fetch(`${ML_API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!resposta.ok) {
    throw new Error(`Falha ao renovar token do Mercado Livre (status ${resposta.status}).`);
  }
  return (await resposta.json()) as TokenMercadoLivre;
}

/**
 * GET autenticado em qualquer recurso da API do ML, com retry controlado
 * (backoff exponencial, no máximo 3 tentativas) para 429/5xx/timeout — nunca
 * um loop infinito. Usado para SEMPRE buscar o estado real de um recurso
 * (pedido, anúncio) em vez de confiar no corpo de uma notificação de webhook.
 */
export async function buscarRecursoAutenticado(caminho: string, accessToken: string): Promise<unknown> {
  const maxTentativas = 3;
  let ultimoErro: unknown;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      const controlador = new AbortController();
      const timeout = setTimeout(() => controlador.abort(), 10_000);
      const resposta = await fetch(`${ML_API_BASE}${caminho}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controlador.signal,
      });
      clearTimeout(timeout);

      if (resposta.status === 429 || resposta.status >= 500) {
        ultimoErro = new Error(`Mercado Livre retornou ${resposta.status} para ${caminho}.`);
        await new Promise((r) => setTimeout(r, 500 * 2 ** (tentativa - 1)));
        continue;
      }
      if (!resposta.ok) {
        throw new Error(`Mercado Livre retornou ${resposta.status} para ${caminho}.`);
      }
      return await resposta.json();
    } catch (erro) {
      ultimoErro = erro;
      if (tentativa < maxTentativas) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** (tentativa - 1)));
      }
    }
  }
  throw ultimoErro instanceof Error ? ultimoErro : new Error("Falha ao consultar recurso no Mercado Livre.");
}

export function mercadoLivreConfigurado(): boolean {
  return Boolean(
    process.env.MERCADO_LIVRE_CLIENT_ID && process.env.MERCADO_LIVRE_CLIENT_SECRET && process.env.MERCADO_LIVRE_REDIRECT_URI
  );
}
