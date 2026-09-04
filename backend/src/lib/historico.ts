import { prisma } from "./prisma";

/**
 * Registra um evento no histórico comercial da empresa. Sempre "melhor
 * esforço": um erro aqui nunca deve derrubar a operação principal que o
 * originou — por isso é chamado com `.catch()` pelos callers, nunca
 * `await`ado de um jeito que propague falha para a resposta HTTP.
 */
export async function registrarEvento(params: {
  empresaId: string;
  tipo: string;
  entidadeTipo: string;
  entidadeId?: string;
  descricao: string;
}): Promise<void> {
  await prisma.eventoHistorico.create({
    data: {
      empresaId: params.empresaId,
      tipo: params.tipo,
      entidadeTipo: params.entidadeTipo,
      entidadeId: params.entidadeId,
      descricao: params.descricao,
    },
  });
}
