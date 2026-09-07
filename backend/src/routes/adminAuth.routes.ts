import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { gerarTokenAdmin } from "../lib/jwt";
import { autenticarAdmin } from "../middleware/adminAuth.middleware";
import { adminLoginSchema } from "../schemas/admin.schema";
import { registrarAcaoAdmin } from "../lib/adminAuditoria";

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
    // revela se um e-mail é ou não de um administrador. Tentativa só é
    // auditada quando corresponde a um admin real (senha errada ou inativo)
    // — um e-mail que nunca existiu não tem adminId para atribuir o evento.
    if (!admin || !admin.ativo) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    const senhaValida = await bcrypt.compare(senha, admin.senhaHash);
    if (!senhaValida) {
      await registrarAcaoAdmin({ adminId: admin.id, acao: "ADMIN_LOGIN_FALHOU", motivo: "Senha incorreta." }).catch((e) =>
        console.error("Erro ao registrar auditoria de login falho:", e)
      );
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    await prisma.adminUsuario.update({ where: { id: admin.id }, data: { ultimoLoginEm: new Date() } });
    await registrarAcaoAdmin({ adminId: admin.id, acao: "ADMIN_LOGIN" }).catch((e) => console.error("Erro ao registrar auditoria de login:", e));

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

// Logout é client-side por natureza (JWT stateless, mesmo padrão do login
// normal) — este endpoint existe só para deixar rastro de auditoria de
// quando um admin encerrou a sessão de propósito. Best-effort: o frontend
// já limpa o token local independentemente da resposta desta chamada.
router.post("/logout", autenticarAdmin, async (req, res) => {
  await registrarAcaoAdmin({ adminId: req.admin!.id, acao: "ADMIN_LOGOUT" }).catch((e) =>
    console.error("Erro ao registrar auditoria de logout:", e)
  );
  return res.status(204).send();
});

export default router;
