import { z } from "zod";

export const enviarMensagemSchema = z.object({
  texto: z.string().trim().min(1, "Mensagem não pode estar vazia.").max(4096),
});

export const conectarWhatsAppSchema = z.object({
  numeroTelefone: z
    .string()
    .trim()
    .min(8, "Informe um número de telefone válido.")
    .max(20),
});
