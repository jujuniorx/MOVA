import { z } from "zod";

const itemPedidoSchema = z.object({
  nome: z.string().trim().min(1).max(200),
  quantidade: z.number().positive().max(999999),
  precoUnitario: z.number().min(0).max(999999999.99),
});

export const pedidoCreateSchema = z.object({
  canal: z.enum(["WHATSAPP", "MERCADO_LIVRE", "SITE_PROPRIO", "MANUAL"]),
  clienteId: z.string().uuid().optional(),
  referenciaExterna: z.string().trim().max(120).optional(),
  itens: z.array(itemPedidoSchema).min(1).max(200),
});

export type PedidoCreateInput = z.infer<typeof pedidoCreateSchema>;
