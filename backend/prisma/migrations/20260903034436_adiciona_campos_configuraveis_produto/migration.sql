-- CreateEnum
CREATE TYPE "TipoCampoProduto" AS ENUM ('TEXTO', 'NUMERO', 'SELECAO_UNICA', 'SELECAO_MULTIPLA');

-- AlterTable
ALTER TABLE "ItemOrcamento" ADD COLUMN     "detalhes" JSONB;

-- CreateTable
CREATE TABLE "CampoProduto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoCampoProduto" NOT NULL,
    "unidade" TEXT,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "produtoId" TEXT NOT NULL,

    CONSTRAINT "CampoProduto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpcaoCampoProduto" (
    "id" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "campoId" TEXT NOT NULL,

    CONSTRAINT "OpcaoCampoProduto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampoProduto_produtoId_idx" ON "CampoProduto"("produtoId");

-- CreateIndex
CREATE INDEX "OpcaoCampoProduto_campoId_idx" ON "OpcaoCampoProduto"("campoId");

-- AddForeignKey
ALTER TABLE "CampoProduto" ADD CONSTRAINT "CampoProduto_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpcaoCampoProduto" ADD CONSTRAINT "OpcaoCampoProduto_campoId_fkey" FOREIGN KEY ("campoId") REFERENCES "CampoProduto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
