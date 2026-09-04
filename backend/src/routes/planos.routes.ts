import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";

const router = Router();

// Mesmo padrão de /orcamentos-publico: endpoint sem autenticação ganha um
// limite próprio, generoso o bastante para uso normal (a tela de planos
// pode ser recarregada várias vezes) mas que impede varredura abusiva.
const limitePublico = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas requisições. Tente novamente em alguns minutos." },
});

// Pública de propósito: preço e limites de plano não são dado sensível —
// uma página de preços precisa funcionar antes do usuário ter conta.
router.get("/", limitePublico, async (_req, res) => {
  try {
    const planos = await prisma.planoConfig.findMany({
      orderBy: { precoMensal: "asc" },
    });
    return res.json(planos);
  } catch (erro) {
    console.error("Erro ao listar planos:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar os planos." });
  }
});

export default router;
