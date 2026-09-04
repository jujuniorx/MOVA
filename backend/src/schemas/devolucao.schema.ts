import { z } from "zod";

const itemDevolucaoInputSchema = z.object({
  produtoId: z.string().uuid("ID de produto inválido."),
  variacaoId: z.string().uuid().optional(),
  quantidade: z.number().int().positive("Quantidade deve ser maior que zero."),
});

export const devolucaoCreateSchema = z.object({
  vendaId: z.string().uuid().optional(),
  pedidoId: z.string().uuid().optional(),
  observacoes: z.string().trim().max(1000).optional(),
  itens: z.array(itemDevolucaoInputSchema).min(1, "Adicione ao menos um item devolvido.").max(200),
});

export const conferenciaSchema = z.object({
  resultado: z.enum(["INTEGRO", "AVARIA", "INCOMPLETO", "DIVERGENTE"], { error: "Resultado inválido." }),
  observacoes: z.string().trim().max(1000).optional(),
});

export type DevolucaoCreateInput = z.infer<typeof devolucaoCreateSchema>;
