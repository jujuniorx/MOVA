import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticarAdmin } from "../middleware/adminAuth.middleware";
import { idParamSchema } from "../schemas/common.schema";
import {
  concederAcessoEspecialSchema,
  reativarEmpresaSchema,
  revogarAcessoEspecialSchema,
  suspenderEmpresaSchema,
} from "../schemas/admin.schema";
import { registrarAcaoAdmin } from "../lib/adminAuditoria";

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

router.get("/empresas", async (req, res) => {
  const termo = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const campo = typeof req.query.campo === "string" ? req.query.campo : "nome";

  if (!termo) {
    const recentes = await prisma.empresa.findMany({
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
        where: { id: { in: empresaIds } },
        select: empresaSelectAdmin,
      });
      return res.json(empresas);
    }

    // Padrão: busca por nome.
    const empresas = await prisma.empresa.findMany({
      where: { nome: { contains: termo, mode: "insensitive" } },
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
      DIAS_15: 15,
      DIAS_30: 30,
      DIAS_90: 90,
      ANO_1: 365,
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
  const logs = await prisma.logAuditoriaAdmin.findMany({
    orderBy: { criadoEm: "desc" },
    take: 200,
    include: { admin: { select: { nome: true, email: true } }, empresa: { select: { nome: true } } },
  });
  return res.json(logs);
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

export default router;
