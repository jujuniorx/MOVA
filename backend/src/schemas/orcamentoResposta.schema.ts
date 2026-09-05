import { z } from "zod";

export const recusarOrcamentoSchema = z.object({
  motivo: z.string().trim().max(500, "Motivo muito longo.").optional(),
});
