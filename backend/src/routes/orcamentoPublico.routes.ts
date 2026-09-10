import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { idParamSchema } from "../schemas/common.schema";
import { recusarOrcamentoSchema } from "../schemas/orcamentoResposta.schema";
import { registrarEvento } from "../lib/historico";
import { enviarEmail, escaparHtml } from "../lib/mailer";
import { frontendUrlPrincipal } from "../lib/config";

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
    select: {
      id: true,
      numero: true,
      empresaId: true,
      status: true,
      cliente: { select: { nome: true } },
      empresa: { select: { nome: true } },
    },
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

    notificarEmpresaRespostaCliente(orcamento, novoStatus, motivoRecusa).catch((e) =>
      console.error("Erro ao notificar empresa sobre resposta do cliente:", e)
    );
  }

  return { status: 200, corpo: { status: novoStatus } };
}

// Notificação por e-mail (best-effort, nunca bloqueia a resposta do
// cliente) para todo usuário ATIVO da empresa — ainda não existe distinção
// de dono/funcionário (RBAC), então "todo usuário ativo" é o equivalente
// mais correto disponível hoje a "avisar quem decide". Sem
// RESEND_API_KEY/EMAIL_REMETENTE configurados, `enviarEmail` só loga em
// desenvolvimento — nunca finge um envio real.
async function notificarEmpresaRespostaCliente(
  orcamento: { id: string; numero: number; empresaId: string; cliente: { nome: string }; empresa: { nome: string } },
  status: "APROVADO" | "RECUSADO",
  motivoRecusa?: string
): Promise<void> {
  const usuarios = await prisma.usuario.findMany({
    where: { empresaId: orcamento.empresaId, ativo: true },
    select: { email: true },
  });
  if (usuarios.length === 0) return;

  const linkOrcamento = `${frontendUrlPrincipal}/orcamentos/${orcamento.id}`;
  const acao = status === "APROVADO" ? "aprovou" : "recusou";
  const assunto = `${orcamento.cliente.nome} ${acao} o orçamento #${orcamento.numero}`;
  const motivoTexto = status === "RECUSADO" && motivoRecusa ? `\nMotivo informado: "${motivoRecusa}"` : "";
  const textoSimples = `${orcamento.cliente.nome} ${acao} o orçamento #${orcamento.numero} da ${orcamento.empresa.nome}.${motivoTexto}\n\nVeja os detalhes: ${linkOrcamento}`;
  const motivoHtml =
    status === "RECUSADO" && motivoRecusa
      ? `<p>Motivo informado: "${escaparHtml(motivoRecusa)}"</p>`
      : "";
  const textoHtml = `<p>${escaparHtml(orcamento.cliente.nome)} <b>${acao}</b> o orçamento #${orcamento.numero}.</p>${motivoHtml}<p><a href="${linkOrcamento}">Ver o orçamento no MOVA</a></p>`;

  await Promise.all(
    usuarios.map((u) =>
      enviarEmail({ para: u.email, assunto, textoSimples, textoHtml }).catch((e) =>
        console.error(`Erro ao enviar e-mail de notificação para ${u.email}:`, e)
      )
    )
  );
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
