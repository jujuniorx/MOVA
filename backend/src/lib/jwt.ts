import jwt from "jsonwebtoken";

function obterSegredo(): string {
  const segredo = process.env.JWT_SECRET;
  if (!segredo) {
    throw new Error("JWT_SECRET não configurado no .env");
  }
  return segredo;
}

export interface TokenPayload {
  sub: string;
  empresaId: string;
  email: string;
}

export function gerarToken(payload: TokenPayload): string {
  return jwt.sign(payload, obterSegredo(), { expiresIn: "7d", algorithm: "HS256" });
}

export function verificarToken(token: string): TokenPayload {
  return jwt.verify(token, obterSegredo(), { algorithms: ["HS256"] }) as unknown as TokenPayload;
}
