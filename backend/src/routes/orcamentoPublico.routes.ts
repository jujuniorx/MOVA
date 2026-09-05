import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { idParamSchema } from "../schemas/common.schema";
import { recusarOrcamentoSchema } from "../schemas/orcamentoResposta.schema";
import { registrarEvento } from "../lib/historico";

const router = Router();

// Único ponto de acesso não autenticado do backend: existe para que o
// cliente final (sem conta no MOVA) consiga abrir o link enviado pelo
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
        respondidoPeloClienteEm: true,
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

// Aprovação/recusa pelo próprio cliente, sem conta no MOVA — o "token" de
// acesso é o próprio UUID do orçamento (122 bits aleatórios, o mesmo link já
// usado para leitura), então nunca aceita nem precisa de nada além do :id.
// Só é permitido a partir de ENVIADO, e o guard atômico (`updateMany` com a
// condição de status na própria cláusula WHERE) garante que duas cliques
// simultâneos no mesmo link — ou um reenvio de formulário — nunca resultem
// em dois eventos de histórico nem numa segunda "aprovação" depois de já
// recusado (mesmo padrão já usado no controle de estoque e na cota de IA).
async function responderOrcamento(
  id: string,
  novoStatus: "APROVADO" | "RECUSADO",
  motivoRecusa?: string
): Promise<{ status: number; corpo: Record<string, unknown> }> {
  const atualizacao = await prisma.orcamento.updateMany({
    where: { id, status: "ENVIADO" },
    data: {
      status: novoStatus,
      respondidoPeloClienteEm: new Date(),
      motivoRecusa: novoStatus === "RECUSADO" ? (motivoRecusa ?? null) : undefined,
    },
  });

  if (atualizacao.count === 0) {
    const existente = await prisma.orcamento.findUnique({ where: { id }, select: { status: true } });
    if (!existente) {
      return { status: 404, corpo: { erro: "Orçamento não encontrado." } };
    }
    const jaFoi: Record<string, string> = {
      APROVADO: "Este orçamento já foi aprovado.",
      RECUSADO: "Este orçamento já foi recusado.",
      RASCUNHO: "Este orçamento ainda não foi enviado.",
    };
    return { status: 409, corpo: { erro: jaFoi[existente.status] ?? "Este orçamento não pode mais ser respondido." } };
  }

  const orcamento = await prisma.orcamento.findUnique({
    where: { id },
    select: { id: true, numero: true, empresaId: true, status: true },
  });

  if (orcamento) {
    registrarEvento({
      empresaId: orcamento.empresaId,
      tipo: novoStatus === "APROVADO" ? "ORCAMENTO_APROVADO_CLIENTE" : "ORCAMENTO_RECUSADO_CLIENTE",
      entidadeTipo: "Orcamento",
      entidadeId: orcamento.id,
      descricao:
        novoStatus === "APROVADO"
          ? `Orçamento #${orcamento.numero} aprovado pelo cliente pelo link público.`
          : `Orçamento #${orcamento.numero} recusado pelo cliente pelo link público${motivoRecusa ? `: "${motivoRecusa}"` : "."}`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));
  }

  return { status: 200, corpo: { status: novoStatus } };
}

router.post("/:id/aprovar", limiteConsultaPublica, async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) {
    return res.status(404).json({ erro: "Orçamento não encontrado." });
  }

  try {
    const resultado = await responderOrcamento(idResultado.data, "APROVADO");
    return res.status(resultado.status).json(resultado.corpo);
  } catch (erro) {
    console.error("Erro ao aprovar orçamento público:", erro);
    return res.status(500).json({ erro: "Não foi possível registrar sua aprovação agora." });
  }
});

router.post("/:id/recusar", limiteConsultaPublica, async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) {
    return res.status(404).json({ erro: "Orçamento não encontrado." });
  }

  const corpoResultado = recusarOrcamentoSchema.safeParse(req.body ?? {});
  if (!corpoResultado.success) {
    return res.status(400).json({ erro: corpoResultado.error.issues[0].message });
  }

  try {
    const resultado = await responderOrcamento(idResultado.data, "RECUSADO", corpoResultado.data.motivo);
    return res.status(resultado.status).json(resultado.corpo);
  } catch (erro) {
    console.error("Erro ao recusar orçamento público:", erro);
    return res.status(500).json({ erro: "Não foi possível registrar sua resposta agora." });
  }
});

export default router;
