import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// Rota 100% pública (sem autenticação, sem empresaId de sessão) — o único
// filtro de identidade é o `slug` da URL. Por isso o `select` abaixo é uma
// allowlist estrita: nunca incluir clientes, orçamentos, vendas, estoque,
// SKU/custos internos ou dados de qualquer outra empresa.
router.get("/:slug", async (req, res) => {
  const slug = req.params.slug?.toLowerCase().trim();
  if (!slug) return res.status(400).json({ erro: "Endereço inválido." });

  try {
    const empresa = await prisma.empresa.findFirst({
      where: { slugPublico: slug, paginaPublicaAtiva: true },
      select: {
        nome: true,
        descricao: true,
        logoUrl: true,
        corPrimaria: true,
        corSecundaria: true,
        telefone: true,
        whatsapp: true,
        endereco: true,
        exibirPrecosPublico: true,
      },
    });

    if (!empresa) {
      return res.status(404).json({ erro: "Página não encontrada." });
    }

    const produtos = await prisma.produto.findMany({
      where: { empresa: { slugPublico: slug }, exibirNaPaginaPublica: true, ativo: true },
      select: {
        id: true,
        nome: true,
        descricao: true,
        imagemUrl: true,
        unidade: true,
        preco: empresa.exibirPrecosPublico,
      },
      orderBy: { nome: "asc" },
      take: 200,
    });

    return res.json({
      empresa: {
        nome: empresa.nome,
        descricao: empresa.descricao,
        logoUrl: empresa.logoUrl,
        corPrimaria: empresa.corPrimaria,
        corSecundaria: empresa.corSecundaria,
        telefone: empresa.telefone,
        whatsapp: empresa.whatsapp,
        endereco: empresa.endereco,
      },
      exibirPrecos: empresa.exibirPrecosPublico,
      produtos,
    });
  } catch (erro) {
    console.error("Erro ao carregar página pública:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar esta página." });
  }
});

export default router;
