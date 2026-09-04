import { prisma } from "./prisma";

interface RegistrarAcaoAdminInput {
  adminId: string;
  empresaId?: string;
  acao: string;
  estadoAnterior?: unknown;
  estadoNovo?: unknown;
  motivo?: string;
}

/**
 * Toda ação administrativa relevante (suspender, reativar, conceder/revogar
 * acesso especial) passa por aqui — nunca é opcional, nunca falha em
 * silêncio: se o registro de auditoria falhar, a rota chamadora deve tratar
 * como uma falha real da operação (ver uso dentro de uma transação).
 */
export async function registrarAcaoAdmin(input: RegistrarAcaoAdminInput) {
  await prisma.logAuditoriaAdmin.create({
    data: {
      adminId: input.adminId,
      empresaId: input.empresaId,
      acao: input.acao,
      estadoAnterior: input.estadoAnterior === undefined ? undefined : (input.estadoAnterior as object),
      estadoNovo: input.estadoNovo === undefined ? undefined : (input.estadoNovo as object),
      motivo: input.motivo,
    },
  });
}
