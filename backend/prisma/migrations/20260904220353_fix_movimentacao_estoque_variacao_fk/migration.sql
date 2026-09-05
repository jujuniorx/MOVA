-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_variacaoId_idx" ON "MovimentacaoEstoque"("variacaoId");

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_variacaoId_fkey" FOREIGN KEY ("variacaoId") REFERENCES "ProdutoVariacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
