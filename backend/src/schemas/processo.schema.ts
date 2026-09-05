import { z } from "zod";

export const contextoProcessoEnum = z.enum(["ORCAMENTO"], { error: "Processo inválido." });

export const statusOrcamentoEnum = z.enum(["RASCUNHO", "ENVIADO", "APROVADO", "RECUSADO"], {
  error: "Status inválido.",
});

const corHexOpcional = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor deve estar no formato #RRGGBB.")
    .optional()
);

const etapaInputSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome da etapa.").max(60, "Nome da etapa muito longo."),
  cor: corHexOpcional,
  statusBase: statusOrcamentoEnum,
});

export const processoUpdateSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do processo.").max(120).default("Meu processo"),
  etapas: z.array(etapaInputSchema).max(20, "Máximo de 20 etapas por processo."),
});

export type EtapaProcessoInput = z.infer<typeof etapaInputSchema>;
