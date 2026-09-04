import type { PlanoTipo, StatusAssinatura } from "@prisma/client";
import { prisma } from "./prisma";

/** Mapa de status "cru" retornado pelo Mercado Pago para o nosso enum interno. */
export function mapearStatusMercadoPago(statusMp: string | undefined): StatusAssinatura {
  switch (statusMp) {
    case "authorized":
      return "ATIVA";
    case "pending":
      return "PENDENTE";
    case "paused":
      return "PAUSADA";
    case "cancelled":
      return "CANCELADA";
    default:
      return "PENDENTE";
  }
}

/**
 * Aplica, de forma idempotente, o efeito de uma mudança de status de
 * assinatura confirmada pelo Mercado Pago. `chaveIdempotencia` deve
 * identificar de forma única esta combinação (recurso + status) — uma
 * segunda chamada com a mesma chave é um no-op seguro (constraint única).
 *
 * Só esta função (chamada exclusivamente pelo webhook, depois de validar a
 * assinatura HMAC e reconsultar a API do Mercado Pago) pode mudar
 * Empresa.planoTipo por causa de pagamento — nenhuma rota autenticada comum
 * tem esse poder.
 */
export async function aplicarStatusAssinatura(params: {
  assinaturaId: string;
  novoStatus: StatusAssinatura;
  planoTipo: PlanoTipo;
  cicloFaturamento: "MENSAL" | "ANUAL";
  proximaCobranca: Date | null;
  chaveIdempotencia: string;
  tipoEvento: string;
  statusRecebidoCru: string;
  payload: object;
}): Promise<{ aplicado: boolean }> {
  try {
    return await prisma.$transaction(async (tx) => {
      // A constraint única em mercadoPagoNotificacaoId é a trava real contra
      // reprocessar o mesmo evento — se já existe, o create abaixo lança
      // P2002 e a transação inteira é abortada sem efeito colateral.
      await tx.eventoAssinatura.create({
        data: {
          assinaturaId: params.assinaturaId,
          mercadoPagoNotificacaoId: params.chaveIdempotencia,
          tipo: params.tipoEvento,
          statusRecebido: params.statusRecebidoCru,
          payload: params.payload as never,
        },
      });

      const assinatura = await tx.assinatura.update({
        where: { id: params.assinaturaId },
        data: {
          status: params.novoStatus,
          proximaCobranca: params.proximaCobranca,
          iniciadaEm: params.novoStatus === "ATIVA" ? new Date() : undefined,
          canceladaEm: params.novoStatus === "CANCELADA" ? new Date() : undefined,
        },
      });

      const planoEfetivo: PlanoTipo =
        params.novoStatus === "ATIVA" ? params.planoTipo : "GRATUITO";
      const cicloEfetivo = params.novoStatus === "ATIVA" ? params.cicloFaturamento : "MENSAL";

      await tx.empresa.update({
        where: { id: assinatura.empresaId },
        data: { planoTipo: planoEfetivo, cicloFaturamento: cicloEfetivo },
      });

      return { aplicado: true };
    });
  } catch (erro) {
    if (
      erro &&
      typeof erro === "object" &&
      "code" in erro &&
      (erro as { code?: string }).code === "P2002"
    ) {
      // Evento já processado antes — idempotência funcionando como esperado.
      return { aplicado: false };
    }
    throw erro;
  }
}
