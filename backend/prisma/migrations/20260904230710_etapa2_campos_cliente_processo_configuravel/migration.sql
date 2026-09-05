-- CreateEnum
CREATE TYPE "ContextoProcesso" AS ENUM ('ORCAMENTO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoCampoProduto" ADD VALUE 'DATA';
ALTER TYPE "TipoCampoProduto" ADD VALUE 'BOOLEANO';

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "camposPersonalizados" JSONB;

-- AlterTable
ALTER TABLE "Orcamento" ADD COLUMN     "etapaProcessoId" TEXT;

-- CreateTable
CREATE TABLE "CampoCliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoCampoProduto" NOT NULL,
    "unidade" TEXT,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "CampoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpcaoCampoCliente" (
    "id" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "campoId" TEXT NOT NULL,

    CONSTRAINT "OpcaoCampoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessoConfig" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "contexto" "ContextoProcesso" NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessoConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtapaProcesso" (
    "id" TEXT NOT NULL,
    "processoConfigId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "cor" TEXT,
    "statusBase" "StatusOrcamento" NOT NULL,

    CONSTRAINT "EtapaProcesso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampoCliente_empresaId_idx" ON "CampoCliente"("empresaId");

-- CreateIndex
CREATE INDEX "OpcaoCampoCliente_campoId_idx" ON "OpcaoCampoCliente"("campoId");

-- CreateIndex
CREATE INDEX "ProcessoConfig_empresaId_idx" ON "ProcessoConfig"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessoConfig_empresaId_contexto_key" ON "ProcessoConfig"("empresaId", "contexto");

-- CreateIndex
CREATE INDEX "EtapaProcesso_processoConfigId_idx" ON "EtapaProcesso"("processoConfigId");

-- CreateIndex
CREATE INDEX "Orcamento_etapaProcessoId_idx" ON "Orcamento"("etapaProcessoId");

-- AddForeignKey
ALTER TABLE "CampoCliente" ADD CONSTRAINT "CampoCliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpcaoCampoCliente" ADD CONSTRAINT "OpcaoCampoCliente_campoId_fkey" FOREIGN KEY ("campoId") REFERENCES "CampoCliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoConfig" ADD CONSTRAINT "ProcessoConfig_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtapaProcesso" ADD CONSTRAINT "EtapaProcesso_processoConfigId_fkey" FOREIGN KEY ("processoConfigId") REFERENCES "ProcessoConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_etapaProcessoId_fkey" FOREIGN KEY ("etapaProcessoId") REFERENCES "EtapaProcesso"("id") ON DELETE SET NULL ON UPDATE CASCADE;
