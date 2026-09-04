import { z } from "zod";

export const localCreateSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres.").max(80),
  tipo: z.enum(["LOJA", "DEPOSITO", "OFICINA", "OUTRO"]).default("OUTRO"),
});

export const movimentacaoCreateSchema = z
  .object({
    produtoId: z.string().uuid("ID de produto inválido."),
    variacaoId: z.string().uuid().optional(),
    localId: z.string().uuid("Selecione um local."),
    localOrigemId: z.string().uuid().optional(),
    tipo: z.enum(["ENTRADA", "SAIDA", "AJUSTE", "TRANSFERENCIA"], { error: "Tipo de movimentação inválido." }),
    quantidade: z
      .number({ error: "Quantidade deve ser um número." })
      .int("Quantidade deve ser um número inteiro.")
      .refine((v) => v !== 0, "Quantidade não pode ser zero."),
    motivo: z.string().trim().max(300).optional(),
  })
  .superRefine((dados, ctx) => {
    if (dados.tipo === "TRANSFERENCIA" && !dados.localOrigemId) {
      ctx.addIssue({ code: "custom", message: "Transferência exige um local de origem.", path: ["localOrigemId"] });
    }
    if (dados.tipo !== "AJUSTE" && dados.quantidade < 0) {
      ctx.addIssue({ code: "custom", message: "Só o ajuste pode usar quantidade negativa.", path: ["quantidade"] });
    }
  });

export type MovimentacaoCreateInput = z.infer<typeof movimentacaoCreateSchema>;
