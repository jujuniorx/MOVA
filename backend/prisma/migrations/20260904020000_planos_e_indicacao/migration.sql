-- CreateEnum
CREATE TYPE "PlanoTipo" AS ENUM ('GRATUITO', 'START', 'BUSINESS', 'PRO');

-- CreateEnum
CREATE TYPE "CicloFaturamento" AS ENUM ('MENSAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "StatusIndicacao" AS ENUM ('PENDENTE', 'VALIDA', 'BLOQUEADA');

-- CreateTable
CREATE TABLE "PlanoConfig" (
    "planoTipo" "PlanoTipo" NOT NULL,
    "precoMensal" DECIMAL(10,2) NOT NULL,
    "precoAnual" DECIMAL(10,2) NOT NULL,
    "limiteClientes" INTEGER,
    "limiteProdutos" INTEGER,
    "limiteOrcamentos" INTEGER,
    "limiteOrcamentosMensal" BOOLEAN NOT NULL DEFAULT true,
    "limiteUsuarios" INTEGER,
    "recursos" JSONB NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanoConfig_pkey" PRIMARY KEY ("planoTipo")
);

-- AlterTable: novas colunas em Empresa (planoTipo/ciclo com default seguro;
-- codigoIndicacao entra opcional para poder ser preenchida antes do NOT NULL).
ALTER TABLE "Empresa"
  ADD COLUMN "planoTipo" "PlanoTipo" NOT NULL DEFAULT 'GRATUITO',
  ADD COLUMN "cicloFaturamento" "CicloFaturamento" NOT NULL DEFAULT 'MENSAL',
  ADD COLUMN "trialBonusAteEm" TIMESTAMP(3),
  ADD COLUMN "codigoIndicacao" TEXT;

-- Backfill: gera um código único e determinístico para as empresas já
-- existentes, a partir dos 8 primeiros caracteres hexadecimais do próprio
-- id (UUID já é único, então isso não colide na prática).
UPDATE "Empresa"
SET "codigoIndicacao" = upper(substring(replace(id::text, '-', ''), 1, 8))
WHERE "codigoIndicacao" IS NULL;

-- Agora que toda linha tem valor, torna a coluna obrigatória e única.
ALTER TABLE "Empresa" ALTER COLUMN "codigoIndicacao" SET NOT NULL;
CREATE UNIQUE INDEX "Empresa_codigoIndicacao_key" ON "Empresa"("codigoIndicacao");

-- CreateTable
CREATE TABLE "Indicacao" (
    "id" TEXT NOT NULL,
    "indicadorId" TEXT NOT NULL,
    "indicadoId" TEXT NOT NULL,
    "status" "StatusIndicacao" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validadaEm" TIMESTAMP(3),

    CONSTRAINT "Indicacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Indicacao_indicadoId_key" ON "Indicacao"("indicadoId");

-- CreateIndex
CREATE INDEX "Indicacao_indicadorId_idx" ON "Indicacao"("indicadorId");

-- AddForeignKey
ALTER TABLE "Indicacao" ADD CONSTRAINT "Indicacao_indicadorId_fkey" FOREIGN KEY ("indicadorId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indicacao" ADD CONSTRAINT "Indicacao_indicadoId_fkey" FOREIGN KEY ("indicadoId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed: configuração inicial dos 4 planos (preços/limites aprovados).
-- Idempotente — pode rodar de novo sem duplicar (planoTipo é a PK).
INSERT INTO "PlanoConfig"
  ("planoTipo", "precoMensal", "precoAnual", "limiteClientes", "limiteProdutos", "limiteOrcamentos", "limiteOrcamentosMensal", "limiteUsuarios", "recursos", "atualizadoEm")
VALUES
  ('GRATUITO', 0,     0,   10,  10,  10,  false, 1,
    '{"estoqueCompleto": false, "iaLimitada": false, "iaCompleta": false, "mercadoLivre": false, "automacoes": false, "relatoriosAvancados": false}'::jsonb,
    CURRENT_TIMESTAMP),
  ('START',    29.90, 299, 100, 100, 100, true,  1,
    '{"estoqueCompleto": false, "iaLimitada": false, "iaCompleta": false, "mercadoLivre": false, "automacoes": false, "relatoriosAvancados": false}'::jsonb,
    CURRENT_TIMESTAMP),
  ('BUSINESS', 59.90, 599, NULL, NULL, NULL, true, 3,
    '{"estoqueCompleto": true, "iaLimitada": true, "iaCompleta": false, "mercadoLivre": false, "automacoes": true, "relatoriosAvancados": true}'::jsonb,
    CURRENT_TIMESTAMP),
  ('PRO',      89.90, 899, NULL, NULL, NULL, true, NULL,
    '{"estoqueCompleto": true, "iaLimitada": true, "iaCompleta": true, "mercadoLivre": true, "automacoes": true, "relatoriosAvancados": true}'::jsonb,
    CURRENT_TIMESTAMP)
ON CONFLICT ("planoTipo") DO NOTHING;
