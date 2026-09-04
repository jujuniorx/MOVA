import { prisma } from "./prisma";
import { decifrar, cifrar } from "./crypto";
import { buscarRecursoAutenticado, renovarToken } from "./mercadoLivre";
import { registrarEvento } from "./historico";

interface RecursoPedidoMercadoLivre {
  id: number | string;
  status?: string;
  total_amount?: number;
  order_items?: Array<{ item?: { title?: string }; quantity?: number; unit_price?: number }>;
}

/**
 * Garante um access_token válido para a conta, renovando com o refresh_token
 * quando estiver perto de expirar. Nunca guarda o token em texto puro — só
 * decifra em memória, pelo tempo de uso.
 */
async function obterAccessTokenValido(contaId: string): Promise<string> {
  const conta = await prisma.contaMercadoLivre.findUniqueOrThrow({ where: { id: contaId } });

  if (conta.expiraEm.getTime() - Date.now() > 60_000) {
    return decifrar(conta.accessTokenCifrado);
  }

  const refreshToken = decifrar(conta.refreshTokenCifrado);
  const novoToken = await renovarToken(refreshToken);
  await prisma.contaMercadoLivre.update({
    where: { id: conta.id },
    data: {
      accessTokenCifrado: cifrar(novoToken.access_token),
      refreshTokenCifrado: cifrar(novoToken.refresh_token),
      expiraEm: new Date(Date.now() + novoToken.expires_in * 1000),
    },
  });
  return novoToken.access_token;
}

/**
 * Processamento real de uma notificação do Mercado Livre — roda DEPOIS do
 * webhook já ter respondido 200. Sempre busca o recurso na API oficial (o
 * payload do webhook só diz "algo mudou", nunca é usado como fonte de
 * verdade). Só marca `processadoEm` quando tudo deu certo; qualquer falha
 * grava `erro` e deixa `processadoEm` nulo, para reprocessamento manual —
 * nunca finge sucesso.
 */
export async function processarNotificacaoMercadoLivre(params: { topico: string; recurso: string; mlUserId: string }) {
  const { topico, recurso, mlUserId } = params;

  const marcarResultado = async (processadoEm: Date | null, erro: string | null) => {
    await prisma.notificacaoMercadoLivre.updateMany({
      where: { recursoId: recurso, topico },
      data: { processadoEm, erro },
    });
  };

  try {
    const conta = await prisma.contaMercadoLivre.findUnique({ where: { mlUserId } });
    if (!conta) {
      await marcarResultado(null, `Nenhuma conta MOVA conectada para o usuário ML ${mlUserId}.`);
      return;
    }

    if (!topico.startsWith("orders")) {
      // Tópicos ainda não implementados (ex.: anúncios, perguntas) só ficam
      // registrados para auditoria — não inventamos processamento para eles.
      await marcarResultado(new Date(), null);
      return;
    }

    const accessToken = await obterAccessTokenValido(conta.id);
    const pedidoMl = (await buscarRecursoAutenticado(recurso, accessToken)) as RecursoPedidoMercadoLivre;

    const itens = (pedidoMl.order_items ?? []).map((item) => ({
      nome: item.item?.title ?? "Item Mercado Livre",
      quantidade: item.quantity ?? 1,
      precoUnitario: item.unit_price ?? 0,
    }));
    const total = itens.reduce((soma, item) => soma + item.quantidade * item.precoUnitario, 0);

    await prisma.pedido.upsert({
      where: { empresaId_canal_referenciaExterna: { empresaId: conta.empresaId, canal: "MERCADO_LIVRE", referenciaExterna: String(pedidoMl.id) } },
      create: {
        empresaId: conta.empresaId,
        canal: "MERCADO_LIVRE",
        referenciaExterna: String(pedidoMl.id),
        itens,
        total,
      },
      update: { itens, total },
    });

    registrarEvento({
      empresaId: conta.empresaId,
      tipo: "PEDIDO_MERCADO_LIVRE_SINCRONIZADO",
      entidadeTipo: "Pedido",
      descricao: `Pedido do Mercado Livre sincronizado (referência ${pedidoMl.id}).`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    await marcarResultado(new Date(), null);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido.";
    console.error("Falha ao processar notificação do Mercado Livre:", erro);
    await marcarResultado(null, mensagem).catch((e) => console.error("Erro ao marcar falha de processamento:", e));
  }
}
