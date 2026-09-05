import { z } from "zod";

export const solicitarRecuperacaoSchema = z.object({
  email: z.string().trim().toLowerCase().max(255, "E-mail inválido.").email("E-mail inválido."),
});

export const redefinirSenhaSchema = z.object({
  token: z.string().trim().min(20, "Token inválido.").max(200, "Token inválido."),
  // Mesma regra de senha usada no cadastro (registrarSchema) — 72 é o
  // limite efetivo do bcrypt.
  novaSenha: z
    .string()
    .min(8, "A senha deve ter ao menos 8 caracteres.")
    .max(72, "A senha deve ter no máximo 72 caracteres."),
});
