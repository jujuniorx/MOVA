import { z } from "zod";

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
  email: z.string().trim().toLowerCase().max(255, "E-mail muito longo.").email("E-mail inválido."),
  // 72 é o limite efetivo do algoritmo bcrypt: bytes além disso são
  // silenciosamente ignorados no hash, então aceitar mais daria uma falsa
  // sensação de senha mais forte e ainda gastaria memória/CPU à toa.
  senha: z
    .string()
    .min(8, "A senha deve ter ao menos 8 caracteres.")
    .max(72, "A senha deve ter no máximo 72 caracteres."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(255, "E-mail inválido.").email("E-mail inválido."),
  senha: z.string().min(1, "Senha é obrigatória.").max(72, "Senha inválida."),
});
