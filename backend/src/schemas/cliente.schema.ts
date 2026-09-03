import { z } from "zod";
import { paraUndefinedSeVazio, stringOpcional } from "./common.schema";

const emailOpcional = z.preprocess(
  paraUndefinedSeVazio,
  z.string().trim().toLowerCase().email("E-mail inválido.").optional()
);

export const clienteCreateSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres.").max(120),
  telefone: stringOpcional(20),
  whatsapp: stringOpcional(20),
  email: emailOpcional,
  observacoes: stringOpcional(1000),
});

export const clienteUpdateSchema = clienteCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });
