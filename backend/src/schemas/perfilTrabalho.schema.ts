import { z } from "zod";

// Passo 1 (PESSOA DESCREVE → MOVA INTERPRETA): só pede a descrição, nunca
// aplica nada — mesmo contrato do perfilOperacional.schema.ts, só que para o
// perfil de trabalho da PESSOA em vez do perfil da empresa.
export const interpretarPerfilTrabalhoSchema = z.object({
  descricaoLivre: z.string().trim().min(3, "Conte um pouco sobre o que você faz no dia a dia.").max(1000),
});

// Passo 2 (PESSOA CONFIRMA → MOVA APLICA): o corpo é exatamente o que a rota
// de interpretação devolveu — o frontend só ecoa de volta o que já mostrou
// na tela (o usuário pode ter ajustado `areasFoco` antes de confirmar).
// `areasFoco` nunca é aplicado sem revalidação contra o vocabulário fixo
// (feito em validarPerfilTrabalho, não aqui) — este schema só garante o formato.
export const confirmarPerfilTrabalhoSchema = z.object({
  descricaoLivre: z.string().trim().min(3).max(1000),
  areasFoco: z.array(z.string().trim().max(30)).max(12),
  resumo: z.string().trim().min(1).max(300),
  origem: z.enum(["ia", "heuristica"]),
});

export const atualizarCargoSchema = z.object({
  cargo: z.string().trim().max(60).nullable(),
});
