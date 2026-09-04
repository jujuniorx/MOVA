import { z } from "zod";

export const checkoutSchema = z.object({
  planoTipo: z.enum(["START", "BUSINESS", "PRO"], { error: "Plano inválido." }),
  cicloFaturamento: z.enum(["MENSAL", "ANUAL"], { error: "Ciclo de faturamento inválido." }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
