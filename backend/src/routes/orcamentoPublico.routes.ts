import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { idParamSchema } from "../schemas/common.schema";

const router = Router();

// Único ponto de acesso não autenticado do backend: existe para que o
// cliente final (sem conta no OrçaFácil) consiga abrir o link enviado pelo
// WhatsApp. Só aceita leitura, só devolve o necessário para exibir o
// documento (sem empresaId, clienteId, produtoId ou contato do cliente),
// e o acesso depende de acertar o UUID do orçamento — não há listagem
// nem busca por empresa/cliente neste router.
const limiteConsultaPublica = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas requisições. Tente novamente em alguns minutos." },
});

router.get("/:id", limiteConsultaPublica, async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) {
    return res.status(404).json({ erro: "Orçamento não encontrado." });
  }

  try {
    const orcamento = await prisma.orcamento.findUnique({
      where: { id: idResultado.data },
      select: {
        numero: true,
        data: true,
        validade: true,
        observacoes: true,
        subtotal: true,
        desconto: true,
        total: true,
        status: true,
        empresa: { select: { nome: true, logoUrl: true, corPrimaria: true } },
        cliente: { select: { nome: true } },
        itens: {
          select: { nome: true, quantidade: true, precoUnitario: true, subtotal: true, detalhes: true },
        },
      },
    });

    if (!orcamento) {
      return res.status(404).json({ erro: "Orçamento não encontrado." });
    }

    return res.json(orcamento);
  } catch (erro) {
    console.error("Erro ao buscar orçamento público:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar o orçamento." });
  }
});

export default router;
