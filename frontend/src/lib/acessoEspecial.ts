import type { DuracaoAcessoEspecial } from "./api";

/**
 * Rótulos de TODOS os valores do enum, incluindo os legados (DIAS_15,
 * DIAS_90, ANO_1) — usados só para exibir acessos concedidos antes da regra
 * oficial virar 7/14/30 dias ou Vitalício. Nunca ofereça os legados ao
 * conceder um acesso novo — para isso use DURACOES_OFICIAIS.
 */
export const ROTULOS_DURACAO_ACESSO_ESPECIAL: Record<DuracaoAcessoEspecial, string> = {
  DIAS_7: "7 dias",
  DIAS_14: "14 dias",
  DIAS_15: "15 dias (legado)",
  DIAS_30: "30 dias",
  DIAS_90: "90 dias (legado)",
  ANO_1: "1 ano (legado)",
  VITALICIO: "Vitalício",
};

/** Únicas durações que o backend aceita para conceder um acesso especial novo. */
export const DURACOES_OFICIAIS: DuracaoAcessoEspecial[] = ["DIAS_7", "DIAS_14", "DIAS_30", "VITALICIO"];
