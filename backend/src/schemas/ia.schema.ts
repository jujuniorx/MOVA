import { z } from "zod";

export const perguntarIASchema = z.object({
  capacidade: z.enum([
    "produtos_mais_vendidos",
    "produtos_estoque_baixo",
    "comparativo_vendas_3_meses",
    "clientes_top",
    "rascunhar_mensagem_cliente",
    "rascunhar_orcamento",
  ]),
  clienteId: z.string().uuid().optional(),
  observacoes: z.string().trim().max(2000).optional(),
});
