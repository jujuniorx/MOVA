import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticarAdmin } from "../middleware/adminAuth.middleware";
import { idParamSchema } from "../schemas/common.schema";
import {
  concederAcessoEspecialSchema,
  excluirEmpresaSchema,
  reativarEmpresaSchema,
  revogarAcessoEspecialSchema,
  suspenderEmpresaSchema,
  usuarioAtivoSchema,
  planoAdminUpdateSchema,
  featureFlagCreateSchema,
  featureFlagUpdateSchema,
} from "../schemas/admin.schema";
import { registrarAcaoAdmin } from "../lib/adminAuditoria";
import { excluirEmpresaCompleta } from "../lib/empresaExclusao";

const router = Router();

router.use(autenticarAdmin);

// Allowlist estrita de campos de Empresa retornados ao admin — nunca inclui
// nada de outra tabela sensível (senhaHash de Usuario, tokens cifrados de
// integrações, conteúdo de conversas de WhatsApp). O painel administrativo
// existe para gerenciar a plataforma, não para ler dados privados do cliente.
const empresaSelectAdmin = {
  id: true,
  nome: true,
  email: true,
  telefone: true,
  planoTipo: true,
  cicloFaturamento: true,
  trialBonusAteEm: true,
  suspensa: true,
  suspensaEm: true,
  suspensaMotivo: true,
  criadoEm: true,
  _count: { select: { usuarios: true, clientes: true, produtos: true, orcamentos: true } },
} as const;

// Filtros de status/plano combinam com a busca por texto (nunca a
// substituem) — usados pela lista e por "Precisa da minha atenção" no
// Início, que já chega com ?status=suspensa pronto para abrir filtrado.
function filtroStatusPlano(req: import("express").Request) {
  const filtro: Record<string, unknown> = {};
  if (req.query.status === "suspensa") filtro.suspensa = true;
  if (req.query.status === "ativa") filtro.suspensa = false;
  if (typeof req.query.plano === "string" && req.query.plano) filtro.planoTipo = req.query.plano;
  return filtro;
}

router.get("/empresas", async (req, res) => {
  const termo = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const campo = typeof req.query.campo === "string" ? req.query.campo : "nome";
  const filtroExtra = filtroStatusPlano(req);

  if (!termo) {
    const recentes = await prisma.empresa.findMany({
      where: filtroExtra,
      select: empresaSelectAdmin,
      orderBy: { criadoEm: "desc" },
      take: 50,
    });
    return res.json(recentes);
  }

  try {
    if (campo === "id") {
      const empresa = await prisma.empresa.findUnique({ where: { id: termo }, select: empresaSelectAdmin });
      return res.json(empresa ? [empresa] : []);
    }

    if (campo === "email_admin") {
      // "E-mail do administrador da empresa" = e-mail de qualquer Usuario
      // daquela empresa — nunca do AdminUsuario (são tabelas diferentes).
      const usuarios = await prisma.usuario.findMany({
        where: { email: { contains: termo, mode: "insensitive" } },
        select: { empresaId: true },
        take: 50,
      });
      const empresaIds = [...new Set(usuarios.map((u) => u.empresaId))];
      const empresas = await prisma.empresa.findMany({
        where: { id: { in: empresaIds }, ...filtroExtra },
        select: empresaSelectAdmin,
      });
      return res.json(empresas);
    }

    // Padrão: busca por nome.
    const empresas = await prisma.empresa.findMany({
      where: { nome: { contains: termo, mode: "insensitive" }, ...filtroExtra },
      select: empresaSelectAdmin,
      take: 50,
      orderBy: { nome: "asc" },
    });
    return res.json(empresas);
  } catch (erro) {
    console.error("Erro ao buscar empresas (admin):", erro);
    return res.status(500).json({ erro: "Não foi possível buscar empresas." });
  }
});

router.get("/empresas/:id", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });

  try {
    const empresa = await prisma.empresa.findUnique({ where: { id: idResultado.data }, select: empresaSelectAdmin });
    if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });

    const assinatura = await prisma.assinatura.findUnique({
      where: { empresaId: empresa.id },
      select: { planoTipo: true, cicloFaturamento: true, status: true, proximaCobranca: true, canceladaEm: true },
    });

    const acessoEspecialAtivo = await prisma.acessoEspecial.findFirst({
      where: {
        empresaId: empresa.id,
        ativo: true,
        OR: [{ expiraEm: null }, { expiraEm: { gt: new Date() } }],
      },
      orderBy: { concedidoEm: "desc" },
      select: {
        id: true,
        planoTipo: true,
        duracao: true,
        concedidoEm: true,
        expiraEm: true,
        motivo: true,
        concedidoPorAdmin: { select: { nome: true } },
      },
    });

    return res.json({
      empresa,
      planoComercial: { planoTipo: empresa.planoTipo, cicloFaturamento: empresa.cicloFaturamento },
      assinatura: assinatura ?? null,
      acessoEspecial: acessoEspecialAtivo,
      cobranca: acessoEspecialAtivo ? "ISENTA (acesso especial ativo)" : assinatura ? assinatura.status : "SEM ASSINATURA",
    });
  } catch (erro) {
    console.error("Erro ao buscar empresa (admin):", erro);
    return res.status(500).json({ erro: "Não foi possível carregar a empresa." });
  }
});

router.post("/empresas/:id/suspender", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });
  const corpo = suspenderEmpresaSchema.safeParse(req.body);
  if (!corpo.success) return res.status(400).json({ erro: corpo.error.issues[0].message });

  try {
    const empresa = await prisma.empresa.findUnique({ where: { id: idResultado.data }, select: { id: true, suspensa: true } });
    if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });
    if (empresa.suspensa) return res.status(409).json({ erro: "Esta empresa já está suspensa." });

    const atualizada = await prisma.empresa.update({
      where: { id: empresa.id },
      data: { suspensa: true, suspensaEm: new Date(), suspensaMotivo: corpo.data.motivo },
      select: empresaSelectAdmin,
    });

    await registrarAcaoAdmin({
      adminId: req.admin!.id,
      empresaId: empresa.id,
      acao: "EMPRESA_SUSPENSA",
      estadoAnterior: { suspensa: false },
      estadoNovo: { suspensa: true },
      motivo: corpo.data.motivo,
    });

    return res.json(atualizada);
  } catch (erro) {
    console.error("Erro ao suspender empresa:", erro);
    return res.status(500).json({ erro: "Não foi possível suspender a empresa." });
  }
});

router.post("/empresas/:id/reativar", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });
  const corpo = reativarEmpresaSchema.safeParse(req.body);
  if (!corpo.success) return res.status(400).json({ erro: corpo.error.issues[0].message });

  try {
    const empresa = await prisma.empresa.findUnique({ where: { id: idResultado.data }, select: { id: true, suspensa: true } });
    if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });
    if (!empresa.suspensa) return res.status(409).json({ erro: "Esta empresa não está suspensa." });

    const atualizada = await prisma.empresa.update({
      where: { id: empresa.id },
      data: { suspensa: false, suspensaEm: null, suspensaMotivo: null },
      select: empresaSelectAdmin,
    });

    await registrarAcaoAdmin({
      adminId: req.admin!.id,
      empresaId: empresa.id,
      acao: "EMPRESA_REATIVADA",
      estadoAnterior: { suspensa: true },
      estadoNovo: { suspensa: false },
      motivo: corpo.data.motivo,
    });

    return res.json(atualizada);
  } catch (erro) {
    console.error("Erro ao reativar empresa:", erro);
    return res.status(500).json({ erro: "Não foi possível reativar a empresa." });
  }
});

// Exclusão DEFINITIVA de uma empresa e tudo que pertence a ela — pensada
// para limpar empresas de teste, não para uso comercial normal (suspender já
// cobre esse caso, sem apagar nada). Duas travas contra exclusão acidental:
// (1) o admin precisa digitar o nome exato da empresa, verificado no
// backend, nunca só confiado do frontend; (2) o registro de auditoria desta
// ação é gravado DEPOIS que a empresa já não existe mais (por isso sem
// empresaId — a própria linha de auditoria da empresa some junto com ela),
// preservando nome/id originais como texto para sempre, mesmo sem a FK.
router.delete("/empresas/:id", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });
  const corpo = excluirEmpresaSchema.safeParse(req.body);
  if (!corpo.success) return res.status(400).json({ erro: corpo.error.issues[0].message });

  try {
    const empresa = await prisma.empresa.findUnique({ where: { id: idResultado.data }, select: { id: true, nome: true } });
    if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });
    if (corpo.data.confirmarNome !== empresa.nome) {
      return res.status(400).json({ erro: "O nome digitado não confere com o nome exato da empresa. Nada foi excluído." });
    }

    await excluirEmpresaCompleta(empresa.id, { adminId: req.admin!.id, nomeEmpresa: empresa.nome, motivo: corpo.data.motivo });

    return res.status(204).send();
  } catch (erro) {
    console.error("Erro ao excluir empresa:", erro);
    return res.status(500).json({ erro: "Não foi possível excluir a empresa. Nenhum dado foi alterado." });
  }
});

// Acesso especial é SEPARADO do plano comercial — nunca escreve em
// Empresa.planoTipo/cicloFaturamento/Assinatura. Só existe um acesso
// especial "ativo" por vez: conceder um novo desativa o anterior.
router.post("/empresas/:id/acesso-especial", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });
  const corpo = concederAcessoEspecialSchema.safeParse(req.body);
  if (!corpo.success) return res.status(400).json({ erro: corpo.error.issues[0].message });

  try {
    const empresa = await prisma.empresa.findUnique({ where: { id: idResultado.data }, select: { id: true } });
    if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });

    const DURACAO_EM_DIAS: Record<string, number | null> = {
      DIAS_7: 7,
      DIAS_14: 14,
      DIAS_30: 30,
      VITALICIO: null,
    };
    const dias = DURACAO_EM_DIAS[corpo.data.duracao];
    const expiraEm = dias === null ? null : new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

    const acessoAnterior = await prisma.acessoEspecial.findFirst({
      where: { empresaId: empresa.id, ativo: true },
    });

    const novoAcesso = await prisma.$transaction(async (tx) => {
      if (acessoAnterior) {
        await tx.acessoEspecial.update({ where: { id: acessoAnterior.id }, data: { ativo: false, revogadoEm: new Date() } });
      }
      return tx.acessoEspecial.create({
        data: {
          empresaId: empresa.id,
          planoTipo: corpo.data.planoTipo,
          duracao: corpo.data.duracao,
          expiraEm,
          concedidoPorAdminId: req.admin!.id,
          motivo: corpo.data.motivo,
        },
      });
    });

    await registrarAcaoAdmin({
      adminId: req.admin!.id,
      empresaId: empresa.id,
      acao: "ACESSO_ESPECIAL_CONCEDIDO",
      estadoAnterior: acessoAnterior ? { planoTipo: acessoAnterior.planoTipo, duracao: acessoAnterior.duracao } : null,
      estadoNovo: { planoTipo: novoAcesso.planoTipo, duracao: novoAcesso.duracao, expiraEm: novoAcesso.expiraEm },
      motivo: corpo.data.motivo,
    });

    return res.status(201).json(novoAcesso);
  } catch (erro) {
    console.error("Erro ao conceder acesso especial:", erro);
    return res.status(500).json({ erro: "Não foi possível conceder o acesso especial." });
  }
});

router.post("/empresas/:id/acesso-especial/revogar", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });
  const corpo = revogarAcessoEspecialSchema.safeParse(req.body);
  if (!corpo.success) return res.status(400).json({ erro: corpo.error.issues[0].message });

  try {
    const acessoAtivo = await prisma.acessoEspecial.findFirst({ where: { empresaId: idResultado.data, ativo: true } });
    if (!acessoAtivo) return res.status(404).json({ erro: "Esta empresa não tem acesso especial ativo." });

    await prisma.acessoEspecial.update({ where: { id: acessoAtivo.id }, data: { ativo: false, revogadoEm: new Date() } });

    await registrarAcaoAdmin({
      adminId: req.admin!.id,
      empresaId: idResultado.data,
      acao: "ACESSO_ESPECIAL_REVOGADO",
      estadoAnterior: { planoTipo: acessoAtivo.planoTipo, duracao: acessoAtivo.duracao, ativo: true },
      estadoNovo: { ativo: false },
      motivo: corpo.data.motivo,
    });

    return res.status(204).send();
  } catch (erro) {
    console.error("Erro ao revogar acesso especial:", erro);
    return res.status(500).json({ erro: "Não foi possível revogar o acesso especial." });
  }
});

router.get("/empresas/:id/auditoria", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });

  const logs = await prisma.logAuditoriaAdmin.findMany({
    where: { empresaId: idResultado.data },
    orderBy: { criadoEm: "desc" },
    take: 100,
    include: { admin: { select: { nome: true, email: true } } },
  });
  return res.json(logs);
});

router.get("/auditoria", async (req, res) => {
  const tipo = typeof req.query.tipo === "string" ? req.query.tipo : undefined;
  const take = Math.min(Number(req.query.take) || 100, 200);
  const skip = Math.max(Number(req.query.skip) || 0, 0);

  const where = tipo ? { acao: tipo } : {};
  const [logs, total] = await Promise.all([
    prisma.logAuditoriaAdmin.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip,
      take,
      include: { admin: { select: { nome: true, email: true } }, empresa: { select: { nome: true } } },
    }),
    prisma.logAuditoriaAdmin.count({ where }),
  ]);
  return res.json({ logs, total, skip, take });
});

// Status técnico das integrações — só contadores/booleanos agregados, NUNCA
// as credenciais em si. "Configurado" reflete só se a env var existe.
router.get("/status-tecnico", async (_req, res) => {
  const [empresasComML, empresasComWhatsapp, notificacoesMLComErro, empresasSuspensas, totalEmpresas] = await Promise.all([
    prisma.contaMercadoLivre.count(),
    prisma.contaWhatsApp.count({ where: { conectada: true } }),
    prisma.notificacaoMercadoLivre.count({ where: { erro: { not: null } } }),
    prisma.empresa.count({ where: { suspensa: true } }),
    prisma.empresa.count(),
  ]);

  return res.json({
    totalEmpresas,
    empresasSuspensas,
    integracoes: {
      mercadoPago: { configurado: Boolean(process.env.MP_ACCESS_TOKEN) },
      mercadoLivre: { configurado: Boolean(process.env.MERCADO_LIVRE_CLIENT_ID), empresasConectadas: empresasComML },
      whatsapp: { configurado: Boolean(process.env.WHATSAPP_ACCESS_TOKEN), empresasConectadas: empresasComWhatsapp },
      ia: { configurado: Boolean(process.env.IA_API_KEY) },
      transcricaoAudio: { configurado: Boolean(process.env.TRANSCRICAO_API_KEY) },
    },
    erros: {
      notificacoesMercadoLivreComErro: notificacoesMLComErro,
    },
  });
});

// ===========================================================================
// USUÁRIOS — visão global (todos os tenants), só para o Admin MOVA.
// ===========================================================================

const usuarioSelectAdmin = {
  id: true,
  nome: true,
  email: true,
  cargo: true,
  ativo: true,
  criadoEm: true,
  empresaId: true,
  empresa: { select: { id: true, nome: true, suspensa: true } },
} as const;

router.get("/usuarios", async (req, res) => {
  const termo = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const take = Math.min(Number(req.query.take) || 50, 100);
  const skip = Math.max(Number(req.query.skip) || 0, 0);

  try {
    const where = termo
      ? { OR: [{ nome: { contains: termo, mode: "insensitive" as const } }, { email: { contains: termo, mode: "insensitive" as const } }] }
      : {};
    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({ where, select: usuarioSelectAdmin, orderBy: { criadoEm: "desc" }, skip, take }),
      prisma.usuario.count({ where }),
    ]);
    return res.json({ usuarios, total, skip, take });
  } catch (erro) {
    console.error("Erro ao buscar usuários (admin):", erro);
    return res.status(500).json({ erro: "Não foi possível buscar usuários." });
  }
});

// Desativação administrativa de UM usuário — diferente de suspender a
// empresa inteira. Bloqueia login e invalida qualquer token já emitido
// (checado em middleware/auth.middleware.ts). Nunca apaga dado nenhum.
router.patch("/usuarios/:id/ativo", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });
  const corpo = usuarioAtivoSchema.safeParse(req.body);
  if (!corpo.success) return res.status(400).json({ erro: corpo.error.issues[0].message });

  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: idResultado.data }, select: { id: true, ativo: true, empresaId: true } });
    if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado." });
    if (usuario.ativo === corpo.data.ativo) {
      return res.status(409).json({ erro: corpo.data.ativo ? "Este usuário já está ativo." : "Este usuário já está desativado." });
    }

    const atualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ativo: corpo.data.ativo },
      select: usuarioSelectAdmin,
    });

    await registrarAcaoAdmin({
      adminId: req.admin!.id,
      empresaId: usuario.empresaId,
      acao: corpo.data.ativo ? "USUARIO_ATIVADO" : "USUARIO_DESATIVADO",
      estadoAnterior: { ativo: usuario.ativo },
      estadoNovo: { ativo: corpo.data.ativo },
      motivo: corpo.data.motivo,
    });

    return res.json(atualizado);
  } catch (erro) {
    console.error("Erro ao alterar status do usuário:", erro);
    return res.status(500).json({ erro: "Não foi possível alterar o status do usuário." });
  }
});

// ===========================================================================
// PLANOS — PlanoConfig já é a fonte de verdade única de preço/limites/
// recursos (ver lib/planos.ts); aqui só expõe leitura + edição administrativa
// sobre a MESMA tabela, nunca um sistema paralelo.
// ===========================================================================

router.get("/planos", async (_req, res) => {
  const planos = await prisma.planoConfig.findMany({ orderBy: { precoMensal: "asc" } });
  return res.json(planos);
});

router.patch("/planos/:tipo", async (req, res) => {
  const tipo = req.params.tipo;
  if (!["GRATUITO", "START", "BUSINESS", "PRO"].includes(tipo)) {
    return res.status(400).json({ erro: "Plano inválido." });
  }
  const corpo = planoAdminUpdateSchema.safeParse(req.body);
  if (!corpo.success) return res.status(400).json({ erro: corpo.error.issues[0].message });

  try {
    const atual = await prisma.planoConfig.findUnique({ where: { planoTipo: tipo as never } });
    if (!atual) return res.status(404).json({ erro: "Plano não encontrado." });

    const dados: Record<string, unknown> = { ...corpo.data };
    if (corpo.data.recursos) {
      dados.recursos = { ...(atual.recursos as object), ...corpo.data.recursos };
    }

    const atualizado = await prisma.planoConfig.update({ where: { planoTipo: tipo as never }, data: dados });

    await registrarAcaoAdmin({
      adminId: req.admin!.id,
      acao: "PLANO_ALTERADO",
      estadoAnterior: atual,
      estadoNovo: atualizado,
      motivo: `Plano ${tipo} atualizado pelo Admin.`,
    });

    return res.json(atualizado);
  } catch (erro) {
    console.error("Erro ao atualizar plano:", erro);
    return res.status(500).json({ erro: "Não foi possível atualizar o plano." });
  }
});

// ===========================================================================
// ASSINATURAS — visão administrativa sobre o model Assinatura já existente
// (alimentado pelos webhooks reais do Mercado Pago, ver webhooks.routes.ts).
// ===========================================================================

router.get("/assinaturas", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const take = Math.min(Number(req.query.take) || 50, 100);
  const skip = Math.max(Number(req.query.skip) || 0, 0);

  try {
    const where = status ? { status: status as never } : {};
    const [assinaturas, total] = await Promise.all([
      prisma.assinatura.findMany({
        where,
        include: { empresa: { select: { id: true, nome: true } } },
        orderBy: { criadoEm: "desc" },
        skip,
        take,
      }),
      prisma.assinatura.count({ where }),
    ]);
    return res.json({ assinaturas, total, skip, take });
  } catch (erro) {
    console.error("Erro ao buscar assinaturas (admin):", erro);
    return res.status(500).json({ erro: "Não foi possível buscar assinaturas." });
  }
});

// ===========================================================================
// ACESSOS ESPECIAIS — visão GLOBAL (a rota por empresa já existe em
// /empresas/:id). Reaproveita o mesmo model AcessoEspecial.
// ===========================================================================

router.get("/acessos-especiais", async (req, res) => {
  const apenasAtivos = req.query.ativo !== "false";
  const take = Math.min(Number(req.query.take) || 50, 100);
  const skip = Math.max(Number(req.query.skip) || 0, 0);

  try {
    const where = apenasAtivos ? { ativo: true } : {};
    const [acessos, total] = await Promise.all([
      prisma.acessoEspecial.findMany({
        where,
        include: { empresa: { select: { id: true, nome: true } }, concedidoPorAdmin: { select: { nome: true } } },
        orderBy: { concedidoEm: "desc" },
        skip,
        take,
      }),
      prisma.acessoEspecial.count({ where }),
    ]);
    return res.json({ acessos, total, skip, take });
  } catch (erro) {
    console.error("Erro ao buscar acessos especiais (admin):", erro);
    return res.status(500).json({ erro: "Não foi possível buscar acessos especiais." });
  }
});

// ===========================================================================
// MÉTRICAS — só contagens agregadas reais (nunca estimativa/mock). Funil de
// ativação: quantas empresas já têm pelo menos 1 registro de cada marco,
// calculado com groupBy (uma query por marco, nunca N+1 por empresa).
// ===========================================================================

router.get("/metricas", async (_req, res) => {
  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalEmpresas,
    empresasAtivas,
    empresasSuspensas,
    empresasNovas30d,
    totalUsuarios,
    empresasPorPlano,
    assinaturasAtivas,
    assinaturasComProblema,
    usoIA30d,
    empresasComOnboarding,
    empresasComProduto,
    empresasComCliente,
    empresasComOrcamento,
    empresasComVenda,
  ] = await Promise.all([
    prisma.empresa.count(),
    prisma.empresa.count({ where: { suspensa: false } }),
    prisma.empresa.count({ where: { suspensa: true } }),
    prisma.empresa.count({ where: { criadoEm: { gte: trintaDiasAtras } } }),
    prisma.usuario.count(),
    prisma.empresa.groupBy({ by: ["planoTipo"], _count: { _all: true } }),
    prisma.assinatura.count({ where: { status: "ATIVA" } }),
    prisma.assinatura.count({ where: { status: { in: ["PAUSADA", "RECUSADA"] } } }),
    prisma.usoIA.count({ where: { criadoEm: { gte: trintaDiasAtras } } }),
    prisma.empresa.count({ where: { onboardingConcluido: true } }),
    prisma.produto.groupBy({ by: ["empresaId"] }).then((r) => r.length),
    prisma.cliente.groupBy({ by: ["empresaId"] }).then((r) => r.length),
    prisma.orcamento.groupBy({ by: ["empresaId"] }).then((r) => r.length),
    prisma.venda.groupBy({ by: ["empresaId"] }).then((r) => r.length),
  ]);

  return res.json({
    empresas: { total: totalEmpresas, ativas: empresasAtivas, suspensas: empresasSuspensas, novas30d: empresasNovas30d },
    usuarios: { total: totalUsuarios },
    empresasPorPlano: empresasPorPlano.map((p) => ({ plano: p.planoTipo, total: p._count._all })),
    assinaturas: { ativas: assinaturasAtivas, comProblema: assinaturasComProblema },
    ia: { chamadas30d: usoIA30d },
    funilAtivacao: {
      totalEmpresas,
      configurouEmpresa: empresasComOnboarding,
      cadastrouProduto: empresasComProduto,
      cadastrouCliente: empresasComCliente,
      fezOrcamento: empresasComOrcamento,
      fezVenda: empresasComVenda,
    },
  });
});

// ===========================================================================
// FEATURE FLAGS — estrutura mínima e extensível (ver lib/featureFlags.ts).
// Nenhuma funcionalidade do produto ainda lê isto — é a base para a
// primeira liberação gradual futura.
// ===========================================================================

router.get("/feature-flags", async (_req, res) => {
  const flags = await prisma.featureFlag.findMany({ orderBy: { criadoEm: "asc" } });
  return res.json(flags);
});

router.post("/feature-flags", async (req, res) => {
  const corpo = featureFlagCreateSchema.safeParse(req.body);
  if (!corpo.success) return res.status(400).json({ erro: corpo.error.issues[0].message });

  try {
    const flag = await prisma.featureFlag.create({ data: corpo.data });
    await registrarAcaoAdmin({
      adminId: req.admin!.id,
      acao: "FEATURE_FLAG_CRIADA",
      estadoNovo: flag,
    });
    return res.status(201).json(flag);
  } catch (erro) {
    if (erro && typeof erro === "object" && "code" in erro && (erro as { code?: string }).code === "P2002") {
      return res.status(409).json({ erro: "Já existe uma funcionalidade experimental com essa chave." });
    }
    console.error("Erro ao criar feature flag:", erro);
    return res.status(500).json({ erro: "Não foi possível criar a funcionalidade experimental." });
  }
});

router.patch("/feature-flags/:id", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });
  const corpo = featureFlagUpdateSchema.safeParse(req.body);
  if (!corpo.success) return res.status(400).json({ erro: corpo.error.issues[0].message });

  try {
    const atual = await prisma.featureFlag.findUnique({ where: { id: idResultado.data } });
    if (!atual) return res.status(404).json({ erro: "Funcionalidade experimental não encontrada." });

    const atualizada = await prisma.featureFlag.update({ where: { id: atual.id }, data: corpo.data });

    await registrarAcaoAdmin({
      adminId: req.admin!.id,
      acao: "FEATURE_FLAG_ALTERADA",
      estadoAnterior: atual,
      estadoNovo: atualizada,
    });

    return res.json(atualizada);
  } catch (erro) {
    console.error("Erro ao atualizar feature flag:", erro);
    return res.status(500).json({ erro: "Não foi possível atualizar a funcionalidade experimental." });
  }
});

// ===========================================================================
// SAÚDE DO SISTEMA — checks leves, nunca chamadas caras (nenhuma requisição
// real a provedor de IA/e-mail/pagamento — só ping no banco e presença de
// variável de ambiente, o mesmo padrão de sinalização já usado em
// iaConfigurada()/emailConfigurado() no resto do backend).
// ===========================================================================

router.get("/saude", async (_req, res) => {
  let bancoOk = true;
  let bancoLatenciaMs: number | null = null;
  try {
    const inicio = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    bancoLatenciaMs = Date.now() - inicio;
  } catch {
    bancoOk = false;
  }

  const servicos = {
    banco: { status: bancoOk ? "operacional" : "indisponivel", latenciaMs: bancoLatenciaMs },
    ia: { status: process.env.IA_API_KEY ? "operacional" : "atencao", detalhe: process.env.IA_API_KEY ? "Configurado" : "IA_API_KEY não configurada" },
    transcricaoAudio: {
      status: process.env.TRANSCRICAO_API_KEY || process.env.OPENAI_API_KEY ? "operacional" : "atencao",
      detalhe: process.env.TRANSCRICAO_API_KEY || process.env.OPENAI_API_KEY ? "Configurado" : "Sem chave de transcrição",
    },
    email: { status: process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE ? "operacional" : "atencao", detalhe: process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE ? "Configurado" : "RESEND_API_KEY/EMAIL_REMETENTE não configurados" },
    mercadoPago: { status: process.env.MP_ACCESS_TOKEN ? "operacional" : "atencao", detalhe: process.env.MP_ACCESS_TOKEN ? "Configurado" : "MP_ACCESS_TOKEN não configurado" },
    mercadoLivre: { status: process.env.MERCADO_LIVRE_CLIENT_ID ? "operacional" : "atencao", detalhe: process.env.MERCADO_LIVRE_CLIENT_ID ? "Configurado" : "Não configurado" },
    whatsapp: { status: process.env.WHATSAPP_ACCESS_TOKEN ? "operacional" : "atencao", detalhe: process.env.WHATSAPP_ACCESS_TOKEN ? "Configurado" : "Não configurado" },
    jobs: { status: "indisponivel", detalhe: "Sem infraestrutura de filas/jobs implementada ainda." },
  };

  const geral = !bancoOk ? "indisponivel" : Object.values(servicos).some((s) => s.status === "atencao") ? "atencao" : "operacional";

  return res.json({ geral, servicos, verificadoEm: new Date().toISOString() });
});

// ===========================================================================
// SEGURANÇA — reaproveita o MESMO LogAuditoriaAdmin (nunca uma tabela
// paralela), filtrado para os tipos de evento relevantes de segurança.
// ===========================================================================

const ACOES_SEGURANCA = ["ADMIN_LOGIN", "ADMIN_LOGIN_FALHOU", "ADMIN_LOGOUT", "EMPRESA_SUSPENSA", "USUARIO_DESATIVADO"];

router.get("/seguranca", async (req, res) => {
  const dias = Math.min(Number(req.query.dias) || 30, 365);
  const tipo = typeof req.query.tipo === "string" ? req.query.tipo : undefined;
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

  const eventos = await prisma.logAuditoriaAdmin.findMany({
    where: {
      criadoEm: { gte: desde },
      acao: tipo ? tipo : { in: ACOES_SEGURANCA },
    },
    include: { admin: { select: { nome: true, email: true } }, empresa: { select: { nome: true } } },
    orderBy: { criadoEm: "desc" },
    take: 200,
  });

  return res.json({ eventos, tiposConhecidos: ACOES_SEGURANCA });
});

// ===========================================================================
// BUSCA GLOBAL — combina empresas + usuários (únicos recursos com busca
// textual segura hoje). Nunca varre conteúdo privado (mensagens, orçamentos).
// ===========================================================================

router.get("/busca", async (req, res) => {
  const termo = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (termo.length < 2) return res.json({ empresas: [], usuarios: [] });

  const [empresas, usuarios] = await Promise.all([
    prisma.empresa.findMany({
      where: { nome: { contains: termo, mode: "insensitive" } },
      select: { id: true, nome: true, suspensa: true, planoTipo: true },
      take: 10,
    }),
    prisma.usuario.findMany({
      where: { OR: [{ nome: { contains: termo, mode: "insensitive" } }, { email: { contains: termo, mode: "insensitive" } }] },
      select: { id: true, nome: true, email: true, empresaId: true, empresa: { select: { nome: true } } },
      take: 10,
    }),
  ]);

  return res.json({ empresas, usuarios });
});

// ===========================================================================
// PROBLEMAS — lista DERIVADA de sinais reais já existentes no sistema (nunca
// fabricada): notificações do Mercado Livre com erro e assinaturas em status
// problemático. Não existe ainda um model de "Problema" com fluxo de status
// (Novo/Investigando/Resolvido/Ignorado) — isso ficaria para uma etapa
// futura, quando houver mais fontes reais de problema para justificar a
// estrutura; hoje é só uma leitura agregada e honesta do que já existe.
// ===========================================================================

router.get("/problemas", async (_req, res) => {
  const [notificacoesComErro, assinaturasComProblema] = await Promise.all([
    prisma.notificacaoMercadoLivre.findMany({
      where: { erro: { not: null } },
      orderBy: { recebidoEm: "desc" },
      take: 50,
      select: { id: true, topico: true, recursoId: true, erro: true, recebidoEm: true, mlUserId: true },
    }),
    prisma.assinatura.findMany({
      where: { status: { in: ["PAUSADA", "RECUSADA", "EXPIRADA"] } },
      orderBy: { atualizadoEm: "desc" },
      take: 50,
      include: { empresa: { select: { id: true, nome: true } } },
    }),
  ]);

  const problemas = [
    ...notificacoesComErro.map((n) => ({
      categoria: "MERCADO_LIVRE" as const,
      severidade: "media" as const,
      titulo: `Notificação do Mercado Livre não processada (${n.topico})`,
      detalhe: n.erro,
      data: n.recebidoEm,
      empresa: null,
      referenciaId: n.id,
    })),
    ...assinaturasComProblema.map((a) => ({
      categoria: "PAGAMENTO" as const,
      severidade: a.status === "RECUSADA" ? ("alta" as const) : ("media" as const),
      titulo: `Assinatura ${a.status.toLowerCase()}`,
      detalhe: a.empresa.nome,
      data: a.atualizadoEm,
      empresa: a.empresa,
      referenciaId: a.id,
    })),
  ].sort((a, b) => b.data.getTime() - a.data.getTime());

  return res.json({ problemas, statusDisponivel: false });
});

export default router;
