-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('PENDENTE', 'ATIVA', 'PAUSADA', 'CANCELADA', 'EXPIRADA', 'RECUSADA');

-- CreateTable
CREATE TABLE "Assinatura" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "planoTipo" "PlanoTipo" NOT NULL,
    "cicloFaturamento" "CicloFaturamento" NOT NULL,
    "status" "StatusAssinatura" NOT NULL DEFAULT 'PENDENTE',
    "mercadoPagoPreapprovalId" TEXT,
    "payerEmail" TEXT,
    "iniciadaEm" TIMESTAMP(3),
    "proximaCobranca" TIMESTAMP(3),
    "canceladaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assinatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoAssinatura" (
    "id" TEXT NOT NULL,
    "assinaturaId" TEXT NOT NULL,
    "mercadoPagoNotificacaoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "statusRecebido" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoAssinatura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Assinatura_empresaId_key" ON "Assinatura"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Assinatura_mercadoPagoPreapprovalId_key" ON "Assinatura"("mercadoPagoPreapprovalId");

-- CreateIndex
CREATE INDEX "Assinatura_mercadoPagoPreapprovalId_idx" ON "Assinatura"("mercadoPagoPreapprovalId");

-- CreateIndex
CREATE UNIQUE INDEX "EventoAssinatura_mercadoPagoNotificacaoId_key" ON "EventoAssinatura"("mercadoPagoNotificacaoId");

-- CreateIndex
CREATE INDEX "EventoAssinatura_assinaturaId_idx" ON "EventoAssinatura"("assinaturaId");

-- AddForeignKey
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoAssinatura" ADD CONSTRAINT "EventoAssinatura_assinaturaId_fkey" FOREIGN KEY ("assinaturaId") REFERENCES "Assinatura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
