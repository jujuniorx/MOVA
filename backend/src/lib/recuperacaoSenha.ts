import crypto from "crypto";
import { prisma } from "./prisma";

const EXPIRACAO_MS = 60 * 60 * 1000; // 1 hora

export function gerarTokenBruto(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(tokenBruto: string): string {
  return crypto.createHash("sha256").update(tokenBruto).digest("hex");
}

export async function criarTokenRecuperacao(usuarioId: string): Promise<string> {
  const tokenBruto = gerarTokenBruto();
  await prisma.tokenRecuperacaoSenha.create({
    data: {
      usuarioId,
      tokenHash: hashToken(tokenBruto),
      expiraEm: new Date(Date.now() + EXPIRACAO_MS),
    },
  });
  return tokenBruto;
}

export interface ResultadoValidacaoToken {
  ok: boolean;
  usuarioId?: string;
  erro?: string;
}

/**
 * Valida um token de recuperação e, se válido, marca IMEDIATAMENTE como
 * usado — via `updateMany` com a condição `usadoEm: null` na própria
 * cláusula WHERE, para garantir uso único mesmo sob duas requisições
 * concorrentes com o mesmo token (mesmo padrão já usado no controle de
 * estoque e na reserva de uso de IA: a segunda requisição sempre encontra
 * `count === 0` e é rejeitada, nunca as duas "ganham").
 */
export async function consumirTokenRecuperacao(tokenBruto: string): Promise<ResultadoValidacaoToken> {
  const tokenHash = hashToken(tokenBruto);

  const registro = await prisma.tokenRecuperacaoSenha.findUnique({ where: { tokenHash } });
  if (!registro) {
    return { ok: false, erro: "Link de recuperação inválido ou já utilizado." };
  }
  if (registro.usadoEm) {
    return { ok: false, erro: "Este link de recuperação já foi utilizado." };
  }
  if (registro.expiraEm < new Date()) {
    return { ok: false, erro: "Este link de recuperação expirou. Solicite um novo." };
  }

  const resultado = await prisma.tokenRecuperacaoSenha.updateMany({
    where: { id: registro.id, usadoEm: null },
    data: { usadoEm: new Date() },
  });
  if (resultado.count === 0) {
    return { ok: false, erro: "Este link de recuperação já foi utilizado." };
  }

  return { ok: true, usuarioId: registro.usuarioId };
}
