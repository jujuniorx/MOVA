import { z } from "zod";
import { stringOpcional } from "./common.schema";

const valorCampoInputSchema = z.object({
  campoId: z.string().uuid("ID de campo inválido."),
  valor: z.union([
    z.string().trim().min(1, "Valor não pode ser vazio.").max(500, "Valor muito longo."),
    z.array(z.string().trim().min(1).max(200)).min(1, "Selecione ao menos uma opção.").max(50, "Muitas opções selecionadas."),
  ]),
});

// Item de uma solicitação pública: propositalmente SEM `precoUnitario` nem
// `nome` — diferente do item interno, aqui o preço é SEMPRE o do cadastro do
// produto, nunca algo que o visitante possa influenciar.
const itemSolicitacaoSchema = z.object({
  produtoId: z.string().uuid("ID de produto inválido."),
  quantidade: z
    .number({ error: "Quantidade deve ser um número." })
    .positive("Quantidade deve ser maior que zero.")
    .max(999999, "Quantidade muito alta.")
    .multipleOf(0.01, "Quantidade deve ter no máximo 2 casas decimais."),
  valoresCampos: z.array(valorCampoInputSchema).max(30, "Muitos campos preenchidos.").optional(),
});

export const orcamentoSolicitacaoSchema = z
  .object({
    clienteNome: z.string().trim().min(2, "Informe seu nome.").max(120),
    clienteTelefone: stringOpcional(20),
    clienteEmail: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().toLowerCase().email("E-mail inválido.").optional()
    ),
    observacoes: stringOpcional(1000),
    itens: z.array(itemSolicitacaoSchema).min(1, "Selecione ao menos um produto ou serviço.").max(50),
  })
  .refine((dados) => Boolean(dados.clienteTelefone || dados.clienteEmail), {
    message: "Informe ao menos um telefone ou e-mail para contato.",
    path: ["clienteTelefone"],
  });

export type OrcamentoSolicitacaoInput = z.infer<typeof orcamentoSolicitacaoSchema>;
