import { z } from "zod";
import { stringOpcional } from "./common.schema";

export const produtoCreateSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres.").max(120),
  descricao: stringOpcional(1000),
  preco: z
    .number({ error: "Preço deve ser um número." })
    .positive("Preço deve ser maior que zero.")
    .max(999999999.99, "Preço muito alto.")
    .multipleOf(0.01, "Preço deve ter no máximo 2 casas decimais."),
  unidade: stringOpcional(20),
  ativo: z.boolean().optional(),
});

export const produtoUpdateSchema = produtoCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });
