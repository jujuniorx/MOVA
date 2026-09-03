import { z } from "zod";
import { stringOpcional } from "./common.schema";

function paraUndefinedSeVazio(val: unknown) {
  return typeof val === "string" && val.trim() === "" ? undefined : val;
}

const emailOpcional = z.preprocess(
  paraUndefinedSeVazio,
  z.string().trim().toLowerCase().email("E-mail inválido.").optional()
);

const urlOpcional = z.preprocess(
  paraUndefinedSeVazio,
  z
    .string()
    .trim()
    .max(500)
    .url("Informe uma URL válida.")
    .regex(/^https:\/\//i, "A URL do logotipo deve começar com https://.")
    .optional()
);

const corOpcional = z.preprocess(
  paraUndefinedSeVazio,
  z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve estar no formato #RRGGBB.")
    .optional()
);

export const empresaUpdateSchema = z
  .object({
    nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres.").max(120).optional(),
    telefone: stringOpcional(20),
    whatsapp: stringOpcional(20),
    email: emailOpcional,
    endereco: stringOpcional(200),
    descricao: stringOpcional(500),
    logoUrl: urlOpcional,
    corPrimaria: corOpcional,
    corSecundaria: corOpcional,
    onboardingConcluido: z.boolean().optional(),
    onboardingPasso: z.number().int().min(0).max(5).optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });
