import { z } from "zod";

function paraUndefinedSeVazio(val: unknown) {
  return typeof val === "string" && val.trim() === "" ? undefined : val;
}

const stringOpcional = (max: number) =>
  z.preprocess(paraUndefinedSeVazio, z.string().trim().max(max).optional());

export const produtoFormSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres.").max(120),
  descricao: stringOpcional(1000),
  preco: z
    .number({ error: "Informe um preço válido." })
    .positive("Preço deve ser maior que zero.")
    .max(999999999.99, "Preço muito alto.")
    .multipleOf(0.01, "Preço deve ter no máximo 2 casas decimais."),
  unidade: stringOpcional(20),
  ativo: z.boolean(),
  tipoProduto: z.enum(["SIMPLES", "KIT"]).optional(),
  controlaEstoque: z.boolean().optional(),
  estoqueMinimo: z.number().int().min(0).max(999999).optional(),
  sku: stringOpcional(60),
  exibirNaPaginaPublica: z.boolean().optional(),
});

export type ProdutoFormInput = z.infer<typeof produtoFormSchema>;
