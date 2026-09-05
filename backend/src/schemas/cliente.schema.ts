import { z } from "zod";
import { paraUndefinedSeVazio, stringOpcional } from "./common.schema";

const emailOpcional = z.preprocess(
  paraUndefinedSeVazio,
  z.string().trim().toLowerCase().email("E-mail inválido.").optional()
);

// Respostas às informações extras configuradas em CampoCliente, chaveadas
// pelo id do campo. Validação de tipo/obrigatoriedade fica no mesmo lugar
// que já valida os campos de produto no orçamento: no formulário — aqui só
// garantimos um objeto plano e de tamanho razoável, para não aceitar
// payloads arbitrariamente grandes ou aninhados.
const camposPersonalizadosOpcional = z
  .record(z.string(), z.json())
  .refine((valor) => Object.keys(valor).length <= 60, "Muitas informações personalizadas.")
  .refine((valor) => JSON.stringify(valor).length <= 20000, "Informações personalizadas muito longas.")
  .optional();

export const clienteCreateSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres.").max(120),
  telefone: stringOpcional(20),
  whatsapp: stringOpcional(20),
  email: emailOpcional,
  observacoes: stringOpcional(1000),
  camposPersonalizados: camposPersonalizadosOpcional,
});

export const clienteUpdateSchema = clienteCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });
