import { Request, Response, NextFunction } from "express";
import { verificarToken } from "../lib/jwt";

export function autenticar(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Não autenticado." });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = verificarToken(token);
    req.usuario = { id: payload.sub, empresaId: payload.empresaId, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }
}
