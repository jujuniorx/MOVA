import { z } from "zod";

export const criarConviteSchema = z.object({
  email: z.string().trim().toLowerCase().max(255, "E-mail muito longo.").email("E-mail inválido."),
  papel: z.enum(["DONO", "FUNCIONARIO"]).default("FUNCIONARIO"),
});

export const aceitarConviteSchema = z.object({
  token: z.string().trim().min(1, "Convite inválido."),
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres.").max(120, "Nome muito longo."),
  // Mesmo limite de 72 do cadastro normal (ver auth.schema.ts) — limite
  // efetivo do bcrypt.
  senha: z.string().min(8, "A senha deve ter ao menos 8 caracteres.").max(72, "A senha deve ter no máximo 72 caracteres."),
});
