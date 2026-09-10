import { Request, Response, NextFunction } from "express";

/**
 * RBAC leve (ver enum PapelUsuario no schema): bloqueia no BACKEND, não só
 * esconde botão no frontend. Sempre usado depois de `autenticar` — assume
 * que `req.usuario` já existe. Guarda hoje só as rotas de gestão de
 * usuários da empresa (convidar, revogar, desativar).
 */
export function exigirDono(req: Request, res: Response, next: NextFunction) {
  if (req.usuario!.papel !== "DONO") {
    return res.status(403).json({ erro: "Só o dono da empresa pode fazer isso." });
  }
  next();
}
