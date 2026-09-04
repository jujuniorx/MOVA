-- Separa "recebido" de "processado com sucesso": processadoEm só é gravado
-- quando o processamento assíncrono realmente terminar sem erro. Tabela
-- ainda não tem uso em produção (feature nova), então a conversão é segura.
ALTER TABLE "NotificacaoMercadoLivre" RENAME COLUMN "processadoEm" TO "recebidoEm";
ALTER TABLE "NotificacaoMercadoLivre" ALTER COLUMN "recebidoEm" SET DEFAULT now();
ALTER TABLE "NotificacaoMercadoLivre" ADD COLUMN "processadoEm" TIMESTAMP(3);
ALTER TABLE "NotificacaoMercadoLivre" ADD COLUMN "erro" TEXT;
