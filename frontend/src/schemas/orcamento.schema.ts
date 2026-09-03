import { z } from "zod";

function paraUndefinedSeVazio(val: unknown) {
  return typeof val === "string" && val.trim() === "" ? undefined : val;
}

const valorCampoFormSchema = z.object({
  campoId: z.string().uuid(),
  valor: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
});

export const itemFormSchema = z.object({
  produtoId: z.string().uuid(),
  quantidade: z
    .number({ error: "Quantidade deve ser um número." })
    .positive("Quantidade deve ser maior que zero.")
    .max(999999, "Quantidade muito alta.")
    .multipleOf(0.01, "Quantidade deve ter no máximo 2 casas decimais."),
  precoUnitario: z
    .number({ error: "Preço deve ser um número." })
    .positive("Preço deve ser maior que zero.")
    .max(999999999.99, "Preço muito alto.")
    .multipleOf(0.01, "Preço deve ter no máximo 2 casas decimais."),
  valoresCampos: z.array(valorCampoFormSchema).optional(),
});

export const orcamentoFormSchema = z
  .object({
    clienteId: z.string().uuid("Selecione um cliente."),
    validade: z.preprocess(paraUndefinedSeVazio, z.string().optional()),
    observacoes: z.preprocess(paraUndefinedSeVazio, z.string().trim().max(1000).optional()),
    desconto: z
      .number({ error: "Desconto deve ser um número." })
      .min(0, "Desconto não pode ser negativo.")
      .max(999999999.99, "Desconto muito alto.")
      .multipleOf(0.01, "Desconto deve ter no máximo 2 casas decimais."),
    itens: z.array(itemFormSchema).min(1, "Adicione ao menos um item ao orçamento."),
  })
  .superRefine((dados, ctx) => {
    const subtotal = dados.itens.reduce(
      (soma, item) => soma + item.quantidade * item.precoUnitario,
      0
    );
    if (dados.desconto > subtotal + 0.001) {
      ctx.addIssue({
        code: "custom",
        message: "Desconto não pode ser maior que o subtotal.",
        path: ["desconto"],
      });
    }
  });

export type OrcamentoFormInput = z.infer<typeof orcamentoFormSchema>;
