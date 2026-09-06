/**
 * FRONTEND_URL aceita uma ou mais origens separadas por vírgula (ex: domínio
 * oficial + "www" + URL de preview do Railway) — usado tanto para a
 * allowlist de CORS (todas as origens) quanto para montar links absolutos
 * enviados a usuários, como o de recuperação de senha (sempre a primeira,
 * a origem "canônica" do produto).
 */
export const frontendUrlsPermitidas = (process.env.FRONTEND_URL ?? "http://localhost:5173")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

export const frontendUrlPrincipal = frontendUrlsPermitidas[0];
