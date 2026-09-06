-- CreateEnum
CREATE TYPE "EstagioCrm" AS ENUM ('NOVO', 'EM_CONTATO', 'PROPOSTA', 'GANHO', 'PERDIDO');

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "estagioCrm" "EstagioCrm" NOT NULL DEFAULT 'NOVO',
ADD COLUMN     "motivoPerda" TEXT,
ADD COLUMN     "origem" TEXT,
ADD COLUMN     "proximoContatoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "cargo" TEXT,
ADD COLUMN     "perfilTrabalho" JSONB;
