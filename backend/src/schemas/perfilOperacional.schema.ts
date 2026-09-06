import { z } from "zod";

// Passo 1 do fluxo obrigatório (EMPRESÁRIO DESCREVE → MOVA INTERPRETA): só
// pede a descrição, nunca aplica nada — a interpretação (IA ou heurística)
// é sempre reversível até o empresário confirmar.
export const interpretarPerfilOperacionalSchema = z.object({
  descricaoNegocio: z.string().trim().min(3, "Conte um pouco sobre o que sua empresa faz.").max(1000),
  ofertaDescricao: z.string().trim().max(1000).optional(),
});

// Passo 2 (EMPRESÁRIO CONFIRMA → MOVA CONFIGURA): o corpo é exatamente o que
// a rota de interpretação devolveu (o frontend só ecoa de volta o que já
// mostrou na tela) — o usuário pode ter ajustado `modulosSugeridos` na tela
// de confirmação antes de enviar. `modulosSugeridos` NUNCA é aplicado sem
// revalidação contra o catálogo real de módulos no backend (isso é feito em
// `definirModulosOpcionais`, não aqui) — este schema só garante o formato.
export const confirmarPerfilOperacionalSchema = z.object({
  descricaoNegocio: z.string().trim().min(3).max(1000),
  // A rota de interpretação devolve `null` (não `undefined`) quando não há
  // oferta — o frontend só ecoa esse valor de volta, então o schema precisa
  // aceitar os dois.
  ofertaDescricao: z.string().trim().max(1000).nullish(),
  trabalhaComProdutos: z.boolean(),
  trabalhaComServicos: z.boolean(),
  modulosSugeridos: z.array(z.string().trim().max(50)).max(10),
  resumo: z.string().trim().min(1).max(300),
  origem: z.enum(["ia", "heuristica"]),
});
