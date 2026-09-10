-- CreateEnum
CREATE TYPE "CategoriaNovidade" AS ENUM ('NOVO', 'MELHORIA', 'CORRECAO', 'IMPORTANTE');

-- CreateTable
CREATE TABLE "Novidade" (
    "id" TEXT NOT NULL,
    "categoria" "CategoriaNovidade" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "link" TEXT,
    "publicadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Novidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NovidadeLeitura" (
    "id" TEXT NOT NULL,
    "novidadeId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "lidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NovidadeLeitura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Novidade_publicadoEm_idx" ON "Novidade"("publicadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "NovidadeLeitura_novidadeId_usuarioId_key" ON "NovidadeLeitura"("novidadeId", "usuarioId");

-- AddForeignKey
ALTER TABLE "NovidadeLeitura" ADD CONSTRAINT "NovidadeLeitura_novidadeId_fkey" FOREIGN KEY ("novidadeId") REFERENCES "Novidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovidadeLeitura" ADD CONSTRAINT "NovidadeLeitura_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
