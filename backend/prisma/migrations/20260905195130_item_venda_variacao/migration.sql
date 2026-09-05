-- AlterTable
ALTER TABLE "ItemVenda" ADD COLUMN     "variacaoId" TEXT;

-- CreateIndex
CREATE INDEX "ItemVenda_variacaoId_idx" ON "ItemVenda"("variacaoId");
