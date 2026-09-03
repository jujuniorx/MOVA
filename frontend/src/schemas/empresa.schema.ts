import { z } from "zod";

function paraUndefinedSeVazio(val: unknown) {
  return typeof val === "string" && val.trim() === "" ? undefined : val;
}

const stringOpcional = (max: number) =>
  z.preprocess(paraUndefinedSeVazio, z.string().trim().max(max).optional());

const emailOpcional = z.preprocess(
  paraUndefinedSeVazio,
  z.string().trim().toLowerCase().email("Informe um e-mail válido.").optional()
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

export const empresaFormSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres.").max(120),
  telefone: stringOpcional(20),
  whatsapp: stringOpcional(20),
  email: emailOpcional,
  endereco: stringOpcional(200),
  descricao: stringOpcional(500),
  logoUrl: urlOpcional,
  corPrimaria: z.string(),
  corSecundaria: z.string(),
});

export type EmpresaFormInput = z.infer<typeof empresaFormSchema>;
