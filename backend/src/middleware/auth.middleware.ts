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
    // pode continuar usando a API. Também invalida qualquer token emitido
    // ANTES da última troca de senha (recuperação ou futura troca manual):
    // sem isso, redefinir a senha não derrubaria sessões antigas que
    // eventualmente vazaram, o que anularia o propósito da própria
    // recuperação de senha.
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { ativo: true, senhaAlteradaEm: true, papel: true, empresa: { select: { suspensa: true } } },
    });
    if (!usuario) {
      return res.status(401).json({ erro: "Token inválido ou expirado." });
    }
    if (usuario.empresa.suspensa) {
      return res.status(403).json({ erro: "Esta conta está suspensa. Entre em contato com o suporte." });
    }
    if (!usuario.ativo) {
      return res.status(403).json({ erro: "Este usuário foi desativado. Entre em contato com o administrador da empresa." });
    }
    if (usuario.senhaAlteradaEm && (!payload.iat || usuario.senhaAlteradaEm.getTime() / 1000 > payload.iat)) {
      return res.status(401).json({ erro: "Sua sessão expirou porque a senha foi alterada. Faça login novamente." });
    }

    req.usuario = { id: payload.sub, empresaId: payload.empresaId, email: payload.email, papel: usuario.papel };
    next();
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }
}
