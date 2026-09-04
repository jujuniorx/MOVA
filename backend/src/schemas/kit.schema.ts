import { z } from "zod";

const itemKitInputSchema = z.object({
  componenteProdutoId: z.string().uuid("ID de produto componente inválido."),
  quantidade: z.number().int().positive("Quantidade do componente deve ser maior que zero."),
});

export const kitUpdateSchema = z.object({
  itens: z.array(itemKitInputSchema).max(100, "Máximo de 100 componentes por kit."),
});

export type ItemKitInput = z.infer<typeof itemKitInputSchema>;
