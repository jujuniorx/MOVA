import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { idParamSchema } from "../schemas/common.schema";

const router = Router();

router.use(autenticar);

// Lista todas as novidades publicadas com o status de leitura DESTE usuário
// (a leitura é por pessoa, não por empresa — cada um decide o que já viu).
// Content é curado pela equipe do MOVA via Admin, nunca por empresa.
router.get("/", async (req, res) => {
  try {
    const [novidades, leituras] = await Promise.all([
      prisma.novidade.findMany({ orderBy: { publicadoEm: "desc" }, take: 50 }),
      prisma.novidadeLeitura.findMany({ where: { usuarioId: req.usuario!.id }, select: { novidadeId: true } }),
    ]);
    const lidasSet = new Set(leituras.map((l) => l.novidadeId));
    const itens = novidades.map((n) => ({ ...n, lida: lidasSet.has(n.id) }));
    const naoLidas = itens.filter((n) => !n.lida).length;
    return res.json({ itens, naoLidas });
  } catch (erro) {
    console.error("Erro ao listar novidades:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar as novidades." });
  }
});

router.post("/:id/marcar-lida", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });

  try {
    const novidade = await prisma.novidade.findUnique({ where: { id: idResultado.data } });
    if (!novidade) return res.status(404).json({ erro: "Novidade não encontrada." });

    // upsert: marcar de novo uma já lida é idempotente, nunca duplica linha
    // nem erra (mesma pessoa pode clicar duas vezes sem problema).
    await prisma.novidadeLeitura.upsert({
      where: { novidadeId_usuarioId: { novidadeId: novidade.id, usuarioId: req.usuario!.id } },
      create: { novidadeId: novidade.id, usuarioId: req.usuario!.id },
      update: {},
    });
    return res.status(204).send();
  } catch (erro) {
    console.error("Erro ao marcar novidade como lida:", erro);
    return res.status(500).json({ erro: "Não foi possível marcar como lida." });
  }
});

router.post("/marcar-todas-lidas", async (req, res) => {
  try {
    const naoLidas = await prisma.novidade.findMany({
      where: { leituras: { none: { usuarioId: req.usuario!.id } } },
      select: { id: true },
    });
    await prisma.novidadeLeitura.createMany({
      data: naoLidas.map((n) => ({ novidadeId: n.id, usuarioId: req.usuario!.id })),
      skipDuplicates: true,
    });
    return res.status(204).send();
  } catch (erro) {
    console.error("Erro ao marcar todas as novidades como lidas:", erro);
    return res.status(500).json({ erro: "Não foi possível marcar tudo como lido." });
  }
});

export default router;
