import { z } from "zod";
import { tipoCampoEnum } from "./campoProduto.schema";

const opcaoInputSchema = z.object({
  rotulo: z.string().trim().min(1, "Informe o rótulo da opção.").max(120, "Rótulo muito longo."),
});

const campoInputSchema = z
  .object({
    nome: z.string().trim().min(1, "Informe o nome do campo.").max(120, "Nome do campo muito longo."),
    tipo: tipoCampoEnum,
    unidade: z.preprocess(
      (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
      z.string().trim().max(20, "Unidade muito longa.").optional()
    ),
    obrigatorio: z.boolean().default(false),
    opcoes: z.array(opcaoInputSchema).max(50, "Máximo de 50 opções por campo.").optional(),
  })
  .superRefine((campo, ctx) => {
    const exigeOpcoes = campo.tipo === "SELECAO_UNICA" || campo.tipo === "SELECAO_MULTIPLA";
    if (exigeOpcoes && (!campo.opcoes || campo.opcoes.length === 0)) {
      ctx.addIssue({
        code: "custom",
        message: `Adicione ao menos uma opção para o campo "${campo.nome}".`,
        path: ["opcoes"],
      });
    }
  });

export const camposClienteUpdateSchema = z.object({
  campos: z.array(campoInputSchema).max(30, "Máximo de 30 campos por cliente."),
});

export type CampoClienteInput = z.infer<typeof campoInputSchema>;
