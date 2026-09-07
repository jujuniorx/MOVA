import { prisma } from "./prisma";

/**
 * Exclusão completa e definitiva de uma empresa e TUDO que pertence a ela —
 * usada apenas pelo Admin MOVA, só para empresas de teste (ver
 * routes/admin.routes.ts para a autorização e auditoria).
 *
 * A maioria das relações do schema não tem `onDelete: Cascade` (proteção
 * deliberada contra apagar dado de cliente por engano em qualquer rota
 * comum) — por isso a ordem abaixo apaga manualmente, dos registros mais
 * "filhos" até a própria Empresa, dentro de uma única transação (tudo ou
 * nada: se qualquer passo falhar, nada é apagado).
 *
 * Algumas tabelas JÁ cascateiam automaticamente (confirmado lendo o schema)
 * e por isso não aparecem aqui: CampoCliente/OpcaoCampoCliente e
 * ProcessoConfig/EtapaProcesso cascateiam de Empresa; CampoProduto/
 * OpcaoCampoProduto e ProdutoVariacao cascateiam de Produto — todas somem
 * sozinhas quando a linha-mãe é apagada.
 *
 * NUNCA chamar isto fora do endpoint administrativo protegido.
 */
export async function excluirEmpresaCompleta(
  empresaId: string,
  auditoria: { adminId: string; nomeEmpresa: string; motivo: string }
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      const contagens = {
        usuarios: await tx.usuario.count({ where: { empresaId } }),
        clientes: await tx.cliente.count({ where: { empresaId } }),
        produtos: await tx.produto.count({ where: { empresaId } }),
        orcamentos: await tx.orcamento.count({ where: { empresaId } }),
      };

      const produtoIds = (await tx.produto.findMany({ where: { empresaId }, select: { id: true } })).map((p) => p.id);
      const orcamentoIds = (await tx.orcamento.findMany({ where: { empresaId }, select: { id: true } })).map((o) => o.id);
      const vendaIds = (await tx.venda.findMany({ where: { empresaId }, select: { id: true } })).map((v) => v.id);
      const pedidoIds = (await tx.pedido.findMany({ where: { empresaId }, select: { id: true } })).map((p) => p.id);
      const devolucaoIds = (await tx.devolucao.findMany({ where: { empresaId }, select: { id: true } })).map((d) => d.id);
      const conversaIds = (await tx.conversaWhatsApp.findMany({ where: { empresaId }, select: { id: true } })).map((c) => c.id);
      const contaMlIds = (await tx.contaMercadoLivre.findMany({ where: { empresaId }, select: { mlUserId: true } })).map((c) => c.mlUserId);
      const assinatura = await tx.assinatura.findUnique({ where: { empresaId }, select: { id: true } });

      // Nível mais profundo — linhas presas a um documento/produto específico.
      if (orcamentoIds.length) await tx.itemOrcamento.deleteMany({ where: { orcamentoId: { in: orcamentoIds } } });
      if (vendaIds.length) await tx.itemVenda.deleteMany({ where: { vendaId: { in: vendaIds } } });
      if (devolucaoIds.length) {
        await tx.conferenciaDevolucao.deleteMany({ where: { devolucaoId: { in: devolucaoIds } } });
        await tx.itemDevolucao.deleteMany({ where: { devolucaoId: { in: devolucaoIds } } });
      }
      if (conversaIds.length) await tx.mensagemWhatsApp.deleteMany({ where: { conversaId: { in: conversaIds } } });
      if (contaMlIds.length) await tx.notificacaoMercadoLivre.deleteMany({ where: { mlUserId: { in: contaMlIds } } });
      if (assinatura) await tx.eventoAssinatura.deleteMany({ where: { assinaturaId: assinatura.id } });
      if (produtoIds.length) {
        // kitProdutoId já cascateia sozinho (onDelete: Cascade) — só
        // componenteProdutoId (produto usado DENTRO de outro kit) precisa
        // de remoção manual antes de apagar o Produto.
        await tx.itemKit.deleteMany({ where: { componenteProdutoId: { in: produtoIds } } });
        await tx.estoqueLocal.deleteMany({ where: { produtoId: { in: produtoIds } } });
      }
      await tx.movimentacaoEstoque.deleteMany({ where: { empresaId } });
      await tx.tokenRecuperacaoSenha.deleteMany({ where: { usuario: { empresaId } } });

      // Documentos "pai" — já sem filhos pendentes, na ordem certa de
      // dependência (Devolução referencia Venda/Pedido; Venda referencia
      // Orçamento/Pedido de origem).
      if (devolucaoIds.length) await tx.devolucao.deleteMany({ where: { id: { in: devolucaoIds } } });
      if (vendaIds.length) await tx.venda.deleteMany({ where: { id: { in: vendaIds } } });
      if (pedidoIds.length) await tx.pedido.deleteMany({ where: { id: { in: pedidoIds } } });
      if (orcamentoIds.length) await tx.orcamento.deleteMany({ where: { id: { in: orcamentoIds } } });
      if (assinatura) await tx.assinatura.delete({ where: { id: assinatura.id } });

      await tx.eventoHistorico.deleteMany({ where: { empresaId } });
      await tx.usoIA.deleteMany({ where: { empresaId } });
      await tx.acessoEspecial.deleteMany({ where: { empresaId } });
      await tx.logAuditoriaAdmin.deleteMany({ where: { empresaId } });
      await tx.conversaWhatsApp.deleteMany({ where: { empresaId } });
      await tx.contaWhatsApp.deleteMany({ where: { empresaId } });
      await tx.contaMercadoLivre.deleteMany({ where: { empresaId } });
      await tx.local.deleteMany({ where: { empresaId } });
      if (produtoIds.length) await tx.produto.deleteMany({ where: { id: { in: produtoIds } } });
      await tx.cliente.deleteMany({ where: { empresaId } });

      // Indicação pode referenciar esta empresa como indicadora OU indicada.
      await tx.indicacao.deleteMany({ where: { OR: [{ indicadorId: empresaId }, { indicadoId: empresaId }] } });

      await tx.usuario.deleteMany({ where: { empresaId } });

      // CampoCliente/ProcessoConfig e seus filhos (OpcaoCampoCliente/
      // EtapaProcesso) cascateiam sozinhos aqui — assim como CampoProduto/
      // OpcaoCampoProduto já cascatearam ao apagar o Produto acima.
      await tx.empresa.delete({ where: { id: empresaId } });

      // Registrado DEPOIS da empresa sumir, na MESMA transação (atômico com
      // a exclusão — nunca existe um estado "empresa apagada sem log" nem
      // "log gravado mas exclusão falhou"). Sem empresaId (ela já não
      // existe) — nome/id originais ficam só como texto, para sempre.
      await tx.logAuditoriaAdmin.create({
        data: {
          adminId: auditoria.adminId,
          acao: "EMPRESA_EXCLUIDA",
          estadoAnterior: { empresaId, nome: auditoria.nomeEmpresa, contagens },
          motivo: auditoria.motivo,
        },
      });
    },
    { timeout: 20000 }
  );
}
