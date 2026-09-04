-- CreateEnum
CREATE TYPE "RoleAdmin" AS ENUM ('ADMIN_MOVA');

-- CreateEnum
CREATE TYPE "DuracaoAcessoEspecial" AS ENUM ('DIAS_15', 'DIAS_30', 'DIAS_90', 'ANO_1', 'VITALICIO');

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "suspensa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspensaEm" TIMESTAMP(3),
ADD COLUMN     "suspensaMotivo" TEXT;

-- CreateTable
CREATE TABLE "AdminUsuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" "RoleAdmin" NOT NULL DEFAULT 'ADMIN_MOVA',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoLoginEm" TIMESTAMP(3),

    CONSTRAINT "AdminUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcessoEspecial" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "planoTipo" "PlanoTipo" NOT NULL,
    "duracao" "DuracaoAcessoEspecial" NOT NULL,
    "concedidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "concedidoPorAdminId" TEXT NOT NULL,
    "motivo" TEXT,
    "revogadoEm" TIMESTAMP(3),

    CONSTRAINT "AcessoEspecial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAuditoriaAdmin" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "empresaId" TEXT,
    "acao" TEXT NOT NULL,
    "estadoAnterior" JSONB,
    "estadoNovo" JSONB,
    "motivo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAuditoriaAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUsuario_email_key" ON "AdminUsuario"("email");

-- CreateIndex
CREATE INDEX "AcessoEspecial_empresaId_ativo_idx" ON "AcessoEspecial"("empresaId", "ativo");

-- CreateIndex
CREATE INDEX "LogAuditoriaAdmin_empresaId_criadoEm_idx" ON "LogAuditoriaAdmin"("empresaId", "criadoEm");

-- CreateIndex
CREATE INDEX "LogAuditoriaAdmin_adminId_criadoEm_idx" ON "LogAuditoriaAdmin"("adminId", "criadoEm");

-- AddForeignKey
ALTER TABLE "AcessoEspecial" ADD CONSTRAINT "AcessoEspecial_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcessoEspecial" ADD CONSTRAINT "AcessoEspecial_concedidoPorAdminId_fkey" FOREIGN KEY ("concedidoPorAdminId") REFERENCES "AdminUsuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAuditoriaAdmin" ADD CONSTRAINT "LogAuditoriaAdmin_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUsuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAuditoriaAdmin" ADD CONSTRAINT "LogAuditoriaAdmin_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

