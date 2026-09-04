import { Request, Response, NextFunction } from "express";
import { verificarToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

export async function autenticar(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Não autenticado." });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = verificarToken(token);

    // Suspensão administrativa precisa ter efeito imediato — mesmo com um
    // JWT ainda válido (até 7 dias), uma empresa suspensa pelo /admin não
    // pode continuar usando a API. Checagem leve (1 campo indexado por PK).
    const empresa = await prisma.empresa.findUnique({
      where: { id: payload.empresaId },
      select: { suspensa: true },
    });
    if (!empresa || empresa.suspensa) {
      return res.status(403).json({ erro: "Esta conta está suspensa. Entre em contato com o suporte." });
    }

    req.usuario = { id: payload.sub, empresaId: payload.empresaId, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }
}
