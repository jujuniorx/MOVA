import { prisma } from "./prisma";

/**
 * Verifica se uma feature flag está ativa para uma empresa: `ativoGlobal`
 * liga para todo mundo; senão, só se o id da empresa estiver em
 * `empresasHabilitadas` (rollout experimental). Nenhuma funcionalidade do
 * produto usa isto ainda — existe como base pronta para quando a primeira
 * feature precisar de liberação gradual (ver Admin → Funcionalidades
 * experimentais para gerenciar).
 */
export async function featureFlagAtiva(chave: string, empresaId: string): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({ where: { chave } });
  if (!flag) return false;
  if (flag.ativoGlobal) return true;
  const habilitadas = Array.isArray(flag.empresasHabilitadas) ? (flag.empresasHabilitadas as string[]) : [];
  return habilitadas.includes(empresaId);
}
