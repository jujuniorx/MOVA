import { z } from "zod";

export const alterarModuloSchema = z.object({
  moduloId: z.string().min(1).max(50),
  ativo: z.boolean(),
});
