import { z } from "zod";

const variacaoInputSchema = z.object({
  nome: z.string().trim().min(1, "Nome da variação é obrigatório.").max(80),
  sku: z.string().trim().max(60).optional().nullable(),
  codigoBarras: z.string().trim().max(60).optional().nullable(),
  precoAdicional: z.number().finite().default(0),
  ativa: z.boolean().default(true),
});

export const variacoesUpdateSchema = z.object({
  variacoes: z.array(variacaoInputSchema).max(100, "Máximo de 100 variações por produto."),
});

export type VariacaoInput = z.infer<typeof variacaoInputSchema>;
