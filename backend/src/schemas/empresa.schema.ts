import { z } from "zod";
import { stringOpcional } from "./common.schema";

function paraUndefinedSeVazio(val: unknown) {
  return typeof val === "string" && val.trim() === "" ? undefined : val;
}

const emailOpcional = z.preprocess(
  paraUndefinedSeVazio,
  z.string().trim().toLowerCase().email("E-mail inválido.").optional()
);

const urlOpcional = z.preprocess(
  paraUndefinedSeVazio,
  z
    .string()
    .trim()
    .max(500)
    .url("Informe uma URL válida.")
    .regex(/^https:\/\//i, "A URL do logotipo deve começar com https://.")
    .optional()
);

const corOpcional = z.preprocess(
  paraUndefinedSeVazio,
  z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve estar no formato #RRGGBB.")
    .optional()
);

// Regras e preferências que a empresa ensina ao MOVA — usadas só como
// contexto em prompts de IA (nunca como instrução executável, ver lib/ia.ts).
// Estrutura fixa (não é um JSON livre arbitrário) para manter previsível o
// que entra no prompt.
export const memoriaIASchema = z
  .object({
    tomComunicacao: z.enum(["formal", "neutro", "descontraido"]).optional(),
    descontoMaximoPercentual: z.number().min(0).max(100).optional(),
    margemMinimaPercentual: z.number().min(0).max(100).optional(),
    regrasLivres: stringOpcional(2000),
  })
  .optional();

const redeSocialUrlOpcional = z.preprocess(
  paraUndefinedSeVazio,
  z.string().trim().max(200).url("Informe um link válido (começando com https://).").optional()
);

// Personalização da página pública além de logo/cores (que já têm campo
// próprio) — estrutura fixa (não é JSON livre), mesmo espírito de
// memoriaIASchema: previsível para validar e para o frontend consumir.
export const sitePersonalizacaoSchema = z
  .object({
    tema: z.enum(["claro", "escuro"]).optional(),
    estilo: z.enum(["minimalista", "moderno", "elegante", "impactante"]).optional(),
    sobreTexto: stringOpcional(1000),
    diferenciais: z.array(z.string().trim().min(1).max(120)).max(6).optional(),
    redesSociais: z
      .object({
        instagram: redeSocialUrlOpcional,
        facebook: redeSocialUrlOpcional,
        tiktok: redeSocialUrlOpcional,
      })
      .optional(),
    horarioAtendimento: stringOpcional(200),
    secoesAtivas: z.array(z.enum(["produtos", "sobre", "diferenciais", "contato"])).max(4).optional(),
  })
  .optional();

export const empresaUpdateSchema = z
  .object({
    nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres.").max(120).optional(),
    telefone: stringOpcional(20),
    whatsapp: stringOpcional(20),
    email: emailOpcional,
    endereco: stringOpcional(200),
    descricao: stringOpcional(500),
    logoUrl: urlOpcional,
    corPrimaria: corOpcional,
    corSecundaria: corOpcional,
    onboardingConcluido: z.boolean().optional(),
    onboardingPasso: z.number().int().min(0).max(5).optional(),
    paginaPublicaAtiva: z.boolean().optional(),
    slugPublico: z.preprocess(
      paraUndefinedSeVazio,
      z
        .string()
        .trim()
        .toLowerCase()
        .min(3, "O endereço da página deve ter ao menos 3 caracteres.")
        .max(60)
        .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Use apenas letras minúsculas, números e hífen (sem espaços).")
        .optional()
    ),
    exibirPrecosPublico: z.boolean().optional(),
    memoriaIA: memoriaIASchema,
    sitePersonalizacao: sitePersonalizacaoSchema,
  })
  .refine((dados) => Object.keys(dados).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });
