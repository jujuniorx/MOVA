import { z } from "zod";

const itemPedidoSchema = z.object({
  nome: z.string().trim().min(1).max(200),
  quantidade: z.number().positive().max(999999),
  precoUnitario: z.number().min(0).max(999999999.99),
  // Opcional: liga este item da entrada (snapshot livre, útil para canais
  // externos que ainda não têm mapeamento) a um Produto real do catálogo —
  // só quando preenchido em TODOS os itens o pedido pode virar Venda de
  // verdade (é isso que dá baixa em estoque).
  produtoId: z.string().uuid().optional(),
});

export const pedidoCreateSchema = z.object({
  canal: z.enum(["WHATSAPP", "MERCADO_LIVRE", "SITE_PROPRIO", "MANUAL"]),
  clienteId: z.string().uuid().optional(),
  referenciaExterna: z.string().trim().max(120).optional(),
  itens: z.array(itemPedidoSchema).min(1).max(200),
});

export type PedidoCreateInput = z.infer<typeof pedidoCreateSchema>;
