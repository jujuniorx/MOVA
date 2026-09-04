import { Request, Response, NextFunction } from "express";
import { verificarTokenAdmin } from "../lib/jwt";
import { prisma } from "../lib/prisma";

/**
 * Autorização administrativa — completamente separada de `autenticar`
 * (usuário comum). Duas camadas independentes precisam passar:
 *  1) o JWT precisa ser válido E ter `tipo: "admin"` (nunca presente num
 *     token de usuário comum, que só é gerado por auth.routes.ts);
 *  2) o admin referenciado no token precisa AINDA existir e estar ativo no
 *     banco — permite revogar acesso instantaneamente (desativar a conta)
 *     mesmo que o token ainda não tenha expirado.
 * Um usuário comum nunca passa por aqui: seu token não tem `tipo: "admin"`
 * e, mesmo que tivesse, seu `sub` não corresponde a nenhum AdminUsuario.
 */
export async function autenticarAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Não autenticado." });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = verificarTokenAdmin(token);

    const admin = await prisma.adminUsuario.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.ativo) {
      return res.status(401).json({ erro: "Acesso administrativo inválido ou revogado." });
    }

    req.admin = { id: admin.id, email: admin.email, nome: admin.nome };
    next();
  } catch {
    return res.status(401).json({ erro: "Token administrativo inválido ou expirado." });
  }
}
