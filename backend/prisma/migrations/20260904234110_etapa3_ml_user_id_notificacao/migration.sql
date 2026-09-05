-- AlterTable
ALTER TABLE "NotificacaoMercadoLivre" ADD COLUMN     "mlUserId" TEXT;

-- CreateIndex
CREATE INDEX "NotificacaoMercadoLivre_mlUserId_idx" ON "NotificacaoMercadoLivre"("mlUserId");
