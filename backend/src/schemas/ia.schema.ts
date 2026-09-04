import { z } from "zod";

export const perguntarIASchema = z.object({
  capacidade: z.enum([
    "produtos_mais_vendidos",
    "produtos_estoque_baixo",
    "comparativo_vendas_3_meses",
    "clientes_top",
    "rascunhar_mensagem_cliente",
    "rascunhar_orcamento",
    "sugerir_produtos_segmento",
    "estruturar_catalogo_texto",
  ]),
  clienteId: z.string().uuid().optional(),
  observacoes: z.string().trim().max(6000).optional(),
});

export const transcreverAudioSchema = z.object({
  audioBase64: z.string().min(1, "Áudio vazio.").max(14_000_000, "Áudio muito longo."),
  tipoMime: z.string().trim().min(1).max(100),
});
