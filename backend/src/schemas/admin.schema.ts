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
