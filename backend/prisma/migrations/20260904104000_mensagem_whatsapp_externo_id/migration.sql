ALTER TABLE "MensagemWhatsApp" ADD COLUMN "externoId" TEXT;
CREATE UNIQUE INDEX "MensagemWhatsApp_externoId_key" ON "MensagemWhatsApp" ("externoId");
