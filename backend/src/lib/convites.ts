import crypto from "crypto";

const EXPIRACAO_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export function gerarTokenConviteBruto(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashTokenConvite(tokenBruto: string): string {
  return crypto.createHash("sha256").update(tokenBruto).digest("hex");
}

export function expiracaoConvite(): Date {
  return new Date(Date.now() + EXPIRACAO_MS);
}
