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
  /// Preenchido automaticamente pelo jsonwebtoken ao assinar (não é passado
  /// em `gerarToken`) — usado para invalidar tokens emitidos antes de uma
  /// troca de senha (ver middleware/auth.middleware.ts).
  iat?: number;
}

export function gerarToken(payload: TokenPayload): string {
  return jwt.sign(payload, obterSegredo(), { expiresIn: "7d", algorithm: "HS256" });
}

export function verificarToken(token: string): TokenPayload {
  return jwt.verify(token, obterSegredo(), { algorithms: ["HS256"] }) as unknown as TokenPayload;
}

// Token administrativo — formato deliberadamente diferente do token de
// usuário comum (sem empresaId, com `tipo: "admin"` fixo pelo servidor) para
// que os dois sistemas de autenticação nunca compartilhem superfície: um
// token de usuário comum nunca tem `tipo === "admin"`, então nunca passa na
// verificação abaixo, não importa o que venha no payload original.
export interface TokenPayloadAdmin {
  sub: string;
  tipo: "admin";
  email: string;
}

export function gerarTokenAdmin(payload: { sub: string; email: string }): string {
  return jwt.sign({ ...payload, tipo: "admin" }, obterSegredo(), { expiresIn: "12h", algorithm: "HS256" });
}

export function verificarTokenAdmin(token: string): TokenPayloadAdmin {
  const payload = jwt.verify(token, obterSegredo(), { algorithms: ["HS256"] }) as unknown as Record<string, unknown>;
  if (payload.tipo !== "admin" || typeof payload.sub !== "string" || typeof payload.email !== "string") {
    throw new Error("Token não é um token administrativo válido.");
  }
  return payload as unknown as TokenPayloadAdmin;
}
