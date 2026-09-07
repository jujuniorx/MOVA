import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  senha: z.string().min(1, "Informe sua senha.").max(72, "Senha inválida."),
});

export const suspenderEmpresaSchema = z.object({
  motivo: z.string().trim().min(3, "Informe o motivo da suspensão.").max(500),
});

export const reativarEmpresaSchema = z.object({
  motivo: z.string().trim().max(500).optional(),
});

export const concederAcessoEspecialSchema = z.object({
  planoTipo: z.enum(["START", "BUSINESS", "PRO"], { error: "Plano inválido." }),
  duracao: z.enum(["DIAS_15", "DIAS_30", "DIAS_90", "ANO_1", "VITALICIO"], { error: "Duração inválida." }),
  motivo: z.string().trim().max(500).optional(),
});

export const revogarAcessoEspecialSchema = z.object({
  motivo: z.string().trim().max(500).optional(),
});

export const usuarioAtivoSchema = z.object({
  ativo: z.boolean(),
  motivo: z.string().trim().max(500).optional(),
});

export const planoAdminUpdateSchema = z.object({
  precoMensal: z.number().positive().max(999999.99).multipleOf(0.01).optional(),
  precoAnual: z.number().positive().max(999999.99).multipleOf(0.01).optional(),
  limiteClientes: z.number().int().positive().nullable().optional(),
  limiteProdutos: z.number().int().positive().nullable().optional(),
  limiteOrcamentos: z.number().int().positive().nullable().optional(),
  limiteUsuarios: z.number().int().positive().nullable().optional(),
  recursos: z.record(z.string(), z.boolean()).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Informe ao menos um campo para atualizar." });

export const featureFlagCreateSchema = z.object({
  chave: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9_]+$/, "Use só letras minúsculas, números e underscore."),
  nome: z.string().trim().min(2).max(120),
  descricao: z.string().trim().max(500).optional(),
});

export const featureFlagUpdateSchema = z
  .object({
    nome: z.string().trim().min(2).max(120).optional(),
    descricao: z.string().trim().max(500).optional(),
    ativoGlobal: z.boolean().optional(),
    empresasHabilitadas: z.array(z.string().uuid()).max(500).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Informe ao menos um campo para atualizar." });
