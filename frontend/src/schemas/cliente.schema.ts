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

export const clienteFormSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres.").max(120),
  telefone: stringOpcional(20),
  whatsapp: stringOpcional(20),
  email: emailOpcional,
  observacoes: stringOpcional(1000),
});

export type ClienteFormInput = z.infer<typeof clienteFormSchema>;
