-- O índice único (produtoId, variacaoId, localId) já existente não impede
-- duplicidade quando variacaoId é NULL: no Postgres, NULL nunca é igual a
-- NULL, então dois registros de EstoqueLocal para o mesmo produto+local sem
-- variação poderiam ser criados em uma corrida de concorrência. Este índice
-- parcial fecha essa lacuna para produtos sem variação (o caso mais comum).
CREATE UNIQUE INDEX "EstoqueLocal_produtoId_localId_sem_variacao_key"
  ON "EstoqueLocal" ("produtoId", "localId")
  WHERE "variacaoId" IS NULL;
