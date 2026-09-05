import { z } from "zod";

// ~2MB de arquivo real vira ~2.7M caracteres em base64 — a margem cobre isso.
export const importarPreviewSchema = z.object({
  arquivoBase64: z.string().min(1, "Arquivo vazio.").max(2_800_000, "Arquivo muito grande (máximo 2MB)."),
});

export const importarConfirmarSchema = z.object({
  arquivoBase64: z.string().min(1, "Arquivo vazio.").max(2_800_000, "Arquivo muito grande (máximo 2MB)."),
  // Nome do campo do MOVA -> índice da coluna do CSV.
  mapeamento: z.record(z.string(), z.number().int().min(0)),
  importarDuplicados: z.boolean().optional(),
});

export const MAX_LINHAS_IMPORTACAO = 2000;
