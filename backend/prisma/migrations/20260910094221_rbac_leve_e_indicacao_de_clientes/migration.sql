-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('DONO', 'FUNCIONARIO');

-- CreateEnum
CREATE TYPE "StatusIndicacaoCliente" AS ENUM ('PENDENTE', 'CONVERTIDA', 'CANCELADA');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "papel" "PapelUsuario" NOT NULL DEFAULT 'DONO';

-- CreateTable
CREATE TABLE "ConviteUsuario" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "papel" "PapelUsuario" NOT NULL DEFAULT 'FUNCIONARIO',
    "tokenHash" TEXT NOT NULL,
    "convidadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "aceitoEm" TIMESTAMP(3),
    "revogadoEm" TIMESTAMP(3),

    CONSTRAINT "ConviteUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndicacaoCliente" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "indicadorUsuarioId" TEXT,
    "indicadorNome" TEXT NOT NULL,
    "indicadorWhatsapp" TEXT,
    "indicadorInstagram" TEXT,
    "clienteId" TEXT,
    "indicadoNome" TEXT NOT NULL,
    "indicadoWhatsapp" TEXT,
    "indicadoInstagram" TEXT,
    "codigoVoucher" TEXT,
    "valorRecompensa" DECIMAL(12,2),
    "pontuacao" INTEGER,
    "status" "StatusIndicacaoCliente" NOT NULL DEFAULT 'PENDENTE',
    "vendaConvertidaId" TEXT,
    "convertidoEm" TIMESTAMP(3),
    "motivoCancelamento" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndicacaoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConviteUsuario_tokenHash_key" ON "ConviteUsuario"("tokenHash");

-- CreateIndex
CREATE INDEX "ConviteUsuario_empresaId_idx" ON "ConviteUsuario"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "IndicacaoCliente_vendaConvertidaId_key" ON "IndicacaoCliente"("vendaConvertidaId");

-- CreateIndex
CREATE INDEX "IndicacaoCliente_empresaId_idx" ON "IndicacaoCliente"("empresaId");

-- CreateIndex
CREATE INDEX "IndicacaoCliente_clienteId_idx" ON "IndicacaoCliente"("clienteId");

-- AddForeignKey
ALTER TABLE "ConviteUsuario" ADD CONSTRAINT "ConviteUsuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConviteUsuario" ADD CONSTRAINT "ConviteUsuario_convidadoPorId_fkey" FOREIGN KEY ("convidadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicacaoCliente" ADD CONSTRAINT "IndicacaoCliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicacaoCliente" ADD CONSTRAINT "IndicacaoCliente_indicadorUsuarioId_fkey" FOREIGN KEY ("indicadorUsuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicacaoCliente" ADD CONSTRAINT "IndicacaoCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicacaoCliente" ADD CONSTRAINT "IndicacaoCliente_vendaConvertidaId_fkey" FOREIGN KEY ("vendaConvertidaId") REFERENCES "Venda"("id") ON DELETE SET NULL ON UPDATE CASCADE;
