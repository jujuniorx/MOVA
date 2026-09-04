-- CreateEnum
CREATE TYPE "TipoProduto" AS ENUM ('SIMPLES', 'KIT');

-- CreateEnum
CREATE TYPE "TipoLocalEstoque" AS ENUM ('LOJA', 'DEPOSITO', 'OFICINA', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoMovimentacaoEstoque" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE', 'TRANSFERENCIA', 'DEVOLUCAO_QUARENTENA', 'DEVOLUCAO_LIBERADA', 'DEVOLUCAO_AVARIA');

-- CreateEnum
CREATE TYPE "StatusVenda" AS ENUM ('CONFIRMADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "OrigemVenda" AS ENUM ('MOVA', 'WHATSAPP', 'MERCADO_LIVRE', 'SITE_PROPRIO', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('RECEBIDO', 'PROCESSANDO', 'CONFIRMADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "CanalPedido" AS ENUM ('WHATSAPP', 'MERCADO_LIVRE', 'SITE_PROPRIO', 'MANUAL');

-- CreateEnum
CREATE TYPE "OrigemDevolucao" AS ENUM ('MERCADO_LIVRE', 'MANUAL');

-- CreateEnum
CREATE TYPE "StatusDevolucao" AS ENUM ('IDENTIFICADA', 'AGUARDANDO_RECEBIMENTO', 'RECEBIDA', 'EM_CONFERENCIA', 'APROVADA', 'REPROVADA', 'SINCRONIZACAO_PENDENTE', 'SINCRONIZADA', 'ERRO_SINCRONIZACAO');

-- CreateEnum
CREATE TYPE "ResultadoConferencia" AS ENUM ('INTEGRO', 'AVARIA', 'INCOMPLETO', 'DIVERGENTE');

-- CreateEnum
CREATE TYPE "DirecaoMensagem" AS ENUM ('ENVIADA', 'RECEBIDA');

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "exibirPrecosPublico" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "paginaPublicaAtiva" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slugPublico" TEXT;

-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "controlaEstoque" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estoqueMinimo" INTEGER,
ADD COLUMN     "exibirNaPaginaPublica" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imagemUrl" TEXT,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "tipoProduto" "TipoProduto" NOT NULL DEFAULT 'SIMPLES';

-- CreateTable
CREATE TABLE "ProdutoVariacao" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sku" TEXT,
    "codigoBarras" TEXT,
    "precoAdicional" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProdutoVariacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemKit" (
    "id" TEXT NOT NULL,
    "kitProdutoId" TEXT NOT NULL,
    "componenteProdutoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "ItemKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Local" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoLocalEstoque" NOT NULL DEFAULT 'OUTRO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Local_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstoqueLocal" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "variacaoId" TEXT,
    "localId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "quantidadeQuarentena" INTEGER NOT NULL DEFAULT 0,
    "quantidadeReservada" INTEGER NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstoqueLocal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoEstoque" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "variacaoId" TEXT,
    "localId" TEXT NOT NULL,
    "localOrigemId" TEXT,
    "tipo" "TipoMovimentacaoEstoque" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "saldoResultante" INTEGER NOT NULL,
    "motivo" TEXT,
    "usuarioId" TEXT,
    "referenciaTipo" TEXT,
    "referenciaId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venda" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT,
    "status" "StatusVenda" NOT NULL DEFAULT 'CONFIRMADA',
    "origem" "OrigemVenda" NOT NULL DEFAULT 'MOVA',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "desconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "orcamentoOrigemId" TEXT,
    "pedidoOrigemId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemVenda" (
    "id" TEXT NOT NULL,
    "vendaId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "quantidade" DECIMAL(12,2) NOT NULL,
    "precoUnitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ItemVenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "empresaId" TEXT NOT NULL,
    "canal" "CanalPedido" NOT NULL,
    "clienteId" TEXT,
    "status" "StatusPedido" NOT NULL DEFAULT 'RECEBIDO',
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "referenciaExterna" TEXT,
    "itens" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Devolucao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "origem" "OrigemDevolucao" NOT NULL DEFAULT 'MANUAL',
    "vendaId" TEXT,
    "pedidoId" TEXT,
    "referenciaExterna" TEXT,
    "payloadExterno" JSONB,
    "status" "StatusDevolucao" NOT NULL DEFAULT 'IDENTIFICADA',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Devolucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemDevolucao" (
    "id" TEXT NOT NULL,
    "devolucaoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "variacaoId" TEXT,
    "quantidade" INTEGER NOT NULL,
    "resultadoConferencia" "ResultadoConferencia",
    "liberadoEm" TIMESTAMP(3),

    CONSTRAINT "ItemDevolucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConferenciaDevolucao" (
    "id" TEXT NOT NULL,
    "devolucaoId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "resultado" "ResultadoConferencia" NOT NULL,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConferenciaDevolucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoHistorico" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "entidadeTipo" TEXT NOT NULL,
    "entidadeId" TEXT,
    "descricao" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaMercadoLivre" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "mlUserId" TEXT NOT NULL,
    "accessTokenCifrado" TEXT NOT NULL,
    "refreshTokenCifrado" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "conectadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContaMercadoLivre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificacaoMercadoLivre" (
    "id" TEXT NOT NULL,
    "notificacaoId" TEXT NOT NULL,
    "topico" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "processadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificacaoMercadoLivre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaWhatsApp" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "numeroTelefone" TEXT,
    "conectada" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContaWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversaWhatsApp" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT,
    "contatoTelefone" TEXT NOT NULL,
    "ultimaMensagemEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversaWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensagemWhatsApp" (
    "id" TEXT NOT NULL,
    "conversaId" TEXT NOT NULL,
    "direcao" "DirecaoMensagem" NOT NULL,
    "conteudo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensagemWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsoIA" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "operacao" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsoIA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProdutoVariacao_produtoId_idx" ON "ProdutoVariacao"("produtoId");

-- CreateIndex
CREATE INDEX "ItemKit_kitProdutoId_idx" ON "ItemKit"("kitProdutoId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemKit_kitProdutoId_componenteProdutoId_key" ON "ItemKit"("kitProdutoId", "componenteProdutoId");

-- CreateIndex
CREATE INDEX "Local_empresaId_idx" ON "Local"("empresaId");

-- CreateIndex
CREATE INDEX "EstoqueLocal_produtoId_idx" ON "EstoqueLocal"("produtoId");

-- CreateIndex
CREATE INDEX "EstoqueLocal_localId_idx" ON "EstoqueLocal"("localId");

-- CreateIndex
CREATE UNIQUE INDEX "EstoqueLocal_produtoId_variacaoId_localId_key" ON "EstoqueLocal"("produtoId", "variacaoId", "localId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_empresaId_idx" ON "MovimentacaoEstoque"("empresaId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_produtoId_idx" ON "MovimentacaoEstoque"("produtoId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_localId_idx" ON "MovimentacaoEstoque"("localId");

-- CreateIndex
CREATE UNIQUE INDEX "Venda_orcamentoOrigemId_key" ON "Venda"("orcamentoOrigemId");

-- CreateIndex
CREATE UNIQUE INDEX "Venda_pedidoOrigemId_key" ON "Venda"("pedidoOrigemId");

-- CreateIndex
CREATE INDEX "Venda_empresaId_idx" ON "Venda"("empresaId");

-- CreateIndex
CREATE INDEX "Venda_clienteId_idx" ON "Venda"("clienteId");

-- CreateIndex
CREATE INDEX "ItemVenda_vendaId_idx" ON "ItemVenda"("vendaId");

-- CreateIndex
CREATE INDEX "ItemVenda_produtoId_idx" ON "ItemVenda"("produtoId");

-- CreateIndex
CREATE INDEX "Pedido_empresaId_idx" ON "Pedido"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_empresaId_canal_referenciaExterna_key" ON "Pedido"("empresaId", "canal", "referenciaExterna");

-- CreateIndex
CREATE INDEX "Devolucao_empresaId_idx" ON "Devolucao"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Devolucao_empresaId_origem_referenciaExterna_key" ON "Devolucao"("empresaId", "origem", "referenciaExterna");

-- CreateIndex
CREATE INDEX "ItemDevolucao_devolucaoId_idx" ON "ItemDevolucao"("devolucaoId");

-- CreateIndex
CREATE INDEX "ItemDevolucao_produtoId_idx" ON "ItemDevolucao"("produtoId");

-- CreateIndex
CREATE INDEX "ConferenciaDevolucao_devolucaoId_idx" ON "ConferenciaDevolucao"("devolucaoId");

-- CreateIndex
CREATE INDEX "EventoHistorico_empresaId_criadoEm_idx" ON "EventoHistorico"("empresaId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "ContaMercadoLivre_empresaId_key" ON "ContaMercadoLivre"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "ContaMercadoLivre_mlUserId_key" ON "ContaMercadoLivre"("mlUserId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificacaoMercadoLivre_notificacaoId_key" ON "NotificacaoMercadoLivre"("notificacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "ContaWhatsApp_empresaId_key" ON "ContaWhatsApp"("empresaId");

-- CreateIndex
CREATE INDEX "ConversaWhatsApp_empresaId_idx" ON "ConversaWhatsApp"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversaWhatsApp_empresaId_contatoTelefone_key" ON "ConversaWhatsApp"("empresaId", "contatoTelefone");

-- CreateIndex
CREATE INDEX "MensagemWhatsApp_conversaId_idx" ON "MensagemWhatsApp"("conversaId");

-- CreateIndex
CREATE INDEX "UsoIA_empresaId_criadoEm_idx" ON "UsoIA"("empresaId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_slugPublico_key" ON "Empresa"("slugPublico");

-- CreateIndex
CREATE UNIQUE INDEX "Produto_empresaId_sku_key" ON "Produto"("empresaId", "sku");

-- AddForeignKey
ALTER TABLE "ProdutoVariacao" ADD CONSTRAINT "ProdutoVariacao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemKit" ADD CONSTRAINT "ItemKit_kitProdutoId_fkey" FOREIGN KEY ("kitProdutoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemKit" ADD CONSTRAINT "ItemKit_componenteProdutoId_fkey" FOREIGN KEY ("componenteProdutoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Local" ADD CONSTRAINT "Local_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstoqueLocal" ADD CONSTRAINT "EstoqueLocal_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstoqueLocal" ADD CONSTRAINT "EstoqueLocal_variacaoId_fkey" FOREIGN KEY ("variacaoId") REFERENCES "ProdutoVariacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstoqueLocal" ADD CONSTRAINT "EstoqueLocal_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_localOrigemId_fkey" FOREIGN KEY ("localOrigemId") REFERENCES "Local"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_orcamentoOrigemId_fkey" FOREIGN KEY ("orcamentoOrigemId") REFERENCES "Orcamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_pedidoOrigemId_fkey" FOREIGN KEY ("pedidoOrigemId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devolucao" ADD CONSTRAINT "Devolucao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devolucao" ADD CONSTRAINT "Devolucao_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devolucao" ADD CONSTRAINT "Devolucao_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemDevolucao" ADD CONSTRAINT "ItemDevolucao_devolucaoId_fkey" FOREIGN KEY ("devolucaoId") REFERENCES "Devolucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemDevolucao" ADD CONSTRAINT "ItemDevolucao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenciaDevolucao" ADD CONSTRAINT "ConferenciaDevolucao_devolucaoId_fkey" FOREIGN KEY ("devolucaoId") REFERENCES "Devolucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenciaDevolucao" ADD CONSTRAINT "ConferenciaDevolucao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoHistorico" ADD CONSTRAINT "EventoHistorico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaMercadoLivre" ADD CONSTRAINT "ContaMercadoLivre_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaWhatsApp" ADD CONSTRAINT "ContaWhatsApp_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversaWhatsApp" ADD CONSTRAINT "ConversaWhatsApp_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversaWhatsApp" ADD CONSTRAINT "ConversaWhatsApp_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemWhatsApp" ADD CONSTRAINT "MensagemWhatsApp_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "ConversaWhatsApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsoIA" ADD CONSTRAINT "UsoIA_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

