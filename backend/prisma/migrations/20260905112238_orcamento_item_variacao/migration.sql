-- AlterTable
ALTER TABLE "ItemOrcamento" ADD COLUMN     "variacaoId" TEXT;

-- CreateIndex
CREATE INDEX "ItemOrcamento_variacaoId_idx" ON "ItemOrcamento"("variacaoId");
