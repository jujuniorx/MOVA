import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { gerarTokenAdmin } from "../lib/jwt";
import { autenticarAdmin } from "../middleware/adminAuth.middleware";
import { adminLoginSchema } from "../schemas/admin.schema";

const router = Router();

// Login administrativo é um alvo de alto valor — limite bem mais rígido que
// o login comum (5 tentativas / 15 min, por IP).
const limiteAdminAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Tente novamente em alguns minutos." },
});

// Não existe /admin/auth/registrar — a única forma de existir um
// AdminUsuario é o script backend/scripts/criarAdmin.ts, rodado localmente.
router.post("/login", limiteAdminAuth, async (req, res) => {
  const resultado = adminLoginSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  const { email, senha } = resultado.data;

  try {
    const admin = await prisma.adminUsuario.findUnique({ where: { email } });

    // Mesma mensagem genérica para "não existe" e "senha errada" — nunca
    // revela se um e-mail é ou não de um administrador.
    if (!admin || !admin.ativo) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    const senhaValida = await bcrypt.compare(senha, admin.senhaHash);
    if (!senhaValida) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    await prisma.adminUsuario.update({ where: { id: admin.id }, data: { ultimoLoginEm: new Date() } });

    const token = gerarTokenAdmin({ sub: admin.id, email: admin.email });
    return res.json({ token, admin: { id: admin.id, nome: admin.nome, email: admin.email, role: admin.role } });
  } catch (erro) {
    console.error("Erro ao autenticar administrador:", erro);
    return res.status(500).json({ erro: "Não foi possível concluir o login." });
  }
});

router.get("/me", autenticarAdmin, (req, res) => {
  return res.json({ admin: req.admin });
});

export default router;
