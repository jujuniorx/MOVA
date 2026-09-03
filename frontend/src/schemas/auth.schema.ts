import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(255).email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe sua senha.").max(72, "Senha inválida."),
});

export const registrarSchema = z.object({
  nomeEmpresa: z
    .string()
    .trim()
    .min(2, "Nome da empresa deve ter ao menos 2 caracteres.")
    .max(120, "Nome da empresa muito longo."),
  nomeUsuario: z
    .string()
    .trim()
    .min(2, "Nome deve ter ao menos 2 caracteres.")
    .max(120, "Nome muito longo."),
  email: z.string().trim().toLowerCase().max(255).email("Informe um e-mail válido."),
  senha: z
    .string()
    .min(8, "A senha deve ter ao menos 8 caracteres.")
    .max(72, "A senha deve ter no máximo 72 caracteres."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegistrarInput = z.infer<typeof registrarSchema>;
