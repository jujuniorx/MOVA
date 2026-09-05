import { z } from "zod";
import { paraUndefinedSeVazio, stringOpcional } from "./common.schema";

const valorCampoInputSchema = z.object({
  campoId: z.string().uuid("ID de campo inválido."),
  valor: z.union([
    z.string().trim().min(1, "Valor não pode ser vazio.").max(500, "Valor muito longo."),
    z
      .array(z.string().trim().min(1).max(200))
      .min(1, "Selecione ao menos uma opção.")
      .max(50, "Muitas opções selecionadas."),
  ]),
});

export const itemInputSchema = z.object({
  produtoId: z.string().uuid("ID de produto inválido."),
  variacaoId: z.string().uuid("ID de variação inválido.").optional(),
  quantidade: z
    .number({ error: "Quantidade deve ser um número." })
    .positive("Quantidade deve ser maior que zero.")
    .max(999999, "Quantidade muito alta.")
    .multipleOf(0.01, "Quantidade deve ter no máximo 2 casas decimais."),
  precoUnitario: z
    .number({ error: "Preço deve ser um número." })
    .positive("Preço deve ser maior que zero.")
    .max(999999999.99, "Preço muito alto.")
    .multipleOf(0.01, "Preço deve ter no máximo 2 casas decimais.")
    .optional(),
  nome: stringOpcional(120),
  valoresCampos: z.array(valorCampoInputSchema).max(30, "Muitos campos preenchidos.").optional(),
});

export const orcamentoCreateSchema = z.object({
  clienteId: z.string().uuid("ID de cliente inválido."),
  validade: z.preprocess(
    paraUndefinedSeVazio,
    z.coerce.date({ error: "Data de validade inválida." }).optional()
  ),
  observacoes: stringOpcional(1000),
  desconto: z
    .number({ error: "Desconto deve ser um número." })
    .min(0, "Desconto não pode ser negativo.")
    .max(999999999.99, "Desconto muito alto.")
    .multipleOf(0.01, "Desconto deve ter no máximo 2 casas decimais.")
    .optional(),
  itens: z
    .array(itemInputSchema)
    .min(1, "Adicione ao menos um item ao orçamento.")
    .max(200, "Um orçamento pode ter no máximo 200 itens."),
});

export const statusUpdateSchema = z.object({
  status: z.enum(["RASCUNHO", "ENVIADO", "APROVADO", "RECUSADO"], {
    error: "Status inválido.",
  }),
});

// null limpa a etapa (volta a mostrar só o status técnico padrão).
export const etapaOrcamentoUpdateSchema = z.object({
  etapaProcessoId: z.string().uuid("ID de etapa inválido.").nullable(),
});

export type ItemInput = z.infer<typeof itemInputSchema>;
export type OrcamentoInput = z.infer<typeof orcamentoCreateSchema>;
