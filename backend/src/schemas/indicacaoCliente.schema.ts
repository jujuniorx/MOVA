import { z } from "zod";
import { paraUndefinedSeVazio, stringOpcional } from "./common.schema";

const uuidOpcional = z.preprocess(paraUndefinedSeVazio, z.string().uuid("ID inválido.").optional());
const decimalOpcional = z.preprocess(
  paraUndefinedSeVazio,
  z.coerce.number().nonnegative("Valor não pode ser negativo.").optional()
);
const inteiroOpcional = z.preprocess(
  paraUndefinedSeVazio,
  z.coerce.number().int("Pontuação deve ser um número inteiro.").nonnegative("Pontuação não pode ser negativa.").optional()
);

export const indicacaoClienteCreateSchema = z.object({
  indicadorUsuarioId: uuidOpcional,
  indicadorNome: z.string().trim().min(2, "Informe quem indicou.").max(120),
  indicadorWhatsapp: stringOpcional(20),
  indicadorInstagram: stringOpcional(120),

  clienteId: uuidOpcional,
  indicadoNome: z.string().trim().min(2, "Informe o nome do cliente indicado.").max(120),
  indicadoWhatsapp: stringOpcional(20),
  indicadoInstagram: stringOpcional(120),

  codigoVoucher: stringOpcional(60),
  valorRecompensa: decimalOpcional,
  pontuacao: inteiroOpcional,
  observacoes: stringOpcional(1000),
});

export const indicacaoClienteUpdateSchema = indicacaoClienteCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "Informe ao menos um campo para atualizar." });

export const indicacaoClienteConverterSchema = z.object({
  vendaId: z.string().uuid("Selecione a venda vinculada."),
});

export const indicacaoClienteCancelarSchema = z.object({
  motivo: stringOpcional(300),
});
