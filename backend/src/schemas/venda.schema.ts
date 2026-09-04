import { z } from "zod";

export const itemVendaInputSchema = z.object({
  produtoId: z.string().uuid("ID de produto inválido."),
  variacaoId: z.string().uuid().optional(),
  quantidade: z.number().positive("Quantidade deve ser maior que zero.").max(999999),
});

export const vendaCreateSchema = z.object({
  clienteId: z.string().uuid().optional(),
  origem: z.enum(["MOVA", "WHATSAPP", "MERCADO_LIVRE", "SITE_PROPRIO", "OUTRO"]).default("MOVA"),
  desconto: z.number().min(0).max(999999999.99).default(0),
  itens: z.array(itemVendaInputSchema).min(1, "Adicione ao menos um item à venda.").max(200),
});

export type VendaCreateInput = z.infer<typeof vendaCreateSchema>;
