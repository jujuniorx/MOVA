import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { empresaSelectPropria } from "../lib/empresaSelect";
import { empresaUpdateSchema } from "../schemas/empresa.schema";

const router = Router();

router.use(autenticar);

// Sem parâmetro de ID: a empresa afetada é sempre a do usuário autenticado
// (req.usuario.empresaId), nunca uma vinda do corpo da requisição ou da URL.

router.get("/", async (req, res) => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: req.usuario!.empresaId },
      select: empresaSelectPropria,
    });

    if (!empresa) {
      return res.status(404).json({ erro: "Empresa não encontrada." });
    }

    return res.json(empresa);
  } catch (erro) {
    console.error("Erro ao buscar dados da empresa:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar os dados da empresa." });
  }
});

router.patch("/", async (req, res) => {
  const resultado = empresaUpdateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  try {
    const empresa = await prisma.empresa.update({
      where: { id: req.usuario!.empresaId },
      data: resultado.data,
      select: empresaSelectPropria,
    });

    return res.json(empresa);
  } catch (erro) {
    if (erro && typeof erro === "object" && "code" in erro && (erro as { code?: string }).code === "P2002") {
      return res.status(409).json({ erro: "Este endereço de página pública já está em uso. Escolha outro." });
    }
    console.error("Erro ao atualizar dados da empresa:", erro);
    return res.status(500).json({ erro: "Não foi possível atualizar os dados da empresa." });
  }
});

export default router;
