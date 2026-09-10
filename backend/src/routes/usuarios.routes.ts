import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { exigirDono } from "../middleware/exigirDono";
import {
  interpretarPerfilTrabalhoSchema,
  confirmarPerfilTrabalhoSchema,
  atualizarCargoSchema,
} from "../schemas/perfilTrabalho.schema";
import { criarConviteSchema, aceitarConviteSchema } from "../schemas/convite.schema";
import { idParamSchema } from "../schemas/common.schema";
import {
  iaConfigurada,
  interpretarPerfilTrabalho,
  interpretarPerfilTrabalhoHeuristico,
  validarPerfilTrabalho,
} from "../lib/ia";
import { gerarTokenConviteBruto, hashTokenConvite, expiracaoConvite } from "../lib/convites";
import { gerarToken } from "../lib/jwt";
import { enviarEmail, escaparHtml } from "../lib/mailer";
import { frontendUrlPrincipal } from "../lib/config";
import { verificarLimite, mensagemLimiteExcedido } from "../lib/planos";
import { registrarEvento } from "../lib/historico";
import { empresaSelectPropria } from "../lib/empresaSelect";

const router = Router();

const limiteConvite = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Tente novamente em alguns minutos." },
});

// Aceitar convite é a única rota deste arquivo que não exige login (quem
// está aceitando ainda não tem conta) — por isso vem ANTES de `router.use(autenticar)`.
router.post("/convites/:token/aceitar", limiteConvite, async (req, res) => {
  const resultado = aceitarConviteSchema.safeParse({ ...req.body, token: req.params.token });
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  const { token, nome, senha } = resultado.data;

  try {
    const convite = await prisma.conviteUsuario.findUnique({ where: { tokenHash: hashTokenConvite(token) } });
    if (!convite) {
      return res.status(400).json({ erro: "Convite inválido ou já utilizado." });
    }
    if (convite.aceitoEm || convite.revogadoEm) {
      return res.status(400).json({ erro: "Este convite não está mais disponível." });
    }
    if (convite.expiraEm < new Date()) {
      return res.status(400).json({ erro: "Este convite expirou. Peça um novo ao dono da empresa." });
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    const { usuario, empresa } = await prisma.$transaction(async (tx) => {
      const marcado = await tx.conviteUsuario.updateMany({
        where: { id: convite.id, aceitoEm: null, revogadoEm: null },
        data: { aceitoEm: new Date() },
      });
      if (marcado.count === 0) {
        throw new Error("CONVITE_JA_USADO");
      }
      const usuario = await tx.usuario.create({
        data: { nome, email: convite.email, senhaHash, empresaId: convite.empresaId, papel: convite.papel },
      });
      const empresa = await tx.empresa.findUniqueOrThrow({
        where: { id: convite.empresaId },
        select: empresaSelectPropria,
      });
      return { usuario, empresa };
    });

    registrarEvento({
      empresaId: empresa.id,
      tipo: "USUARIO_CONVITE_ACEITO",
      entidadeTipo: "Usuario",
      entidadeId: usuario.id,
      descricao: `${usuario.nome} (${usuario.email}) entrou na equipe como ${usuario.papel === "DONO" ? "dono" : "funcionário"}.`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    const jwt = gerarToken({ sub: usuario.id, empresaId: empresa.id, email: usuario.email });
    return res.status(201).json({
      token: jwt,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
      empresa,
    });
  } catch (erro) {
    if (erro instanceof Error && erro.message === "CONVITE_JA_USADO") {
      return res.status(400).json({ erro: "Este convite não está mais disponível." });
    }
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return res.status(409).json({ erro: "Já existe uma conta com este e-mail." });
    }
    console.error("Erro ao aceitar convite:", erro);
    return res.status(500).json({ erro: "Não foi possível concluir o convite agora." });
  }
});

router.use(autenticar);

// Sem parâmetro de ID em nenhuma rota abaixo: a pessoa afetada é sempre a do
// token (req.usuario.id), nunca outra vinda do corpo ou da URL — perfil de
// trabalho é por PESSOA, não por empresa, então isolar por empresaId não
// basta aqui (impediria só cross-tenant, não um usuário editando o perfil de
// um colega da mesma empresa).

router.get("/me/perfil-trabalho", async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { id: req.usuario!.id },
      select: { cargo: true, perfilTrabalho: true },
    });
    return res.json({ cargo: usuario.cargo, perfilTrabalho: usuario.perfilTrabalho ?? null });
  } catch (erro) {
    console.error("Erro ao buscar perfil de trabalho:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar seu perfil de trabalho." });
  }
});

router.patch("/me/cargo", async (req, res) => {
  const resultado = atualizarCargoSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  try {
    await prisma.usuario.update({ where: { id: req.usuario!.id }, data: { cargo: resultado.data.cargo } });
    return res.status(204).send();
  } catch (erro) {
    console.error("Erro ao atualizar cargo:", erro);
    return res.status(500).json({ erro: "Não foi possível salvar agora." });
  }
});

// Passo 1 (PESSOA DESCREVE → MOVA INTERPRETA): só interpreta (IA quando
// configurada, heurística por palavra-chave como fallback) e devolve o
// rascunho — nunca grava nada, mesmo padrão de segurança do Perfil
// Operacional da empresa (ver empresa.routes.ts).
router.post("/me/perfil-trabalho/interpretar", async (req, res) => {
  const resultado = interpretarPerfilTrabalhoSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  const { descricaoLivre } = resultado.data;

  try {
    let interpretado;
    let origem: "ia" | "heuristica";

    if (iaConfigurada()) {
      try {
        const resultadoIA = await interpretarPerfilTrabalho(descricaoLivre);
        interpretado = validarPerfilTrabalho(resultadoIA.texto);
        origem = "ia";
      } catch (erro) {
        console.error("Falha ao interpretar perfil de trabalho com IA, usando heurística:", erro);
        interpretado = interpretarPerfilTrabalhoHeuristico(descricaoLivre);
        origem = "heuristica";
      }
    } else {
      interpretado = interpretarPerfilTrabalhoHeuristico(descricaoLivre);
      origem = "heuristica";
    }

    return res.json({
      descricaoLivre,
      areasFoco: interpretado.areasFoco,
      resumo: interpretado.resumo,
      origem,
    });
  } catch (erro) {
    console.error("Erro ao interpretar perfil de trabalho:", erro);
    return res.status(500).json({ erro: "Não foi possível entender a descrição agora. Tente novamente." });
  }
});

// Passo 2 (PESSOA CONFIRMA → MOVA APLICA): só agora grava — `areasFoco`
// nunca é aplicado sem revalidação contra o vocabulário fixo
// (AREAS_FOCO_VALIDAS, em lib/ia.ts), então um valor forjado no corpo nunca
// entra numa área inexistente.
router.post("/me/perfil-trabalho/confirmar", async (req, res) => {
  const resultado = confirmarPerfilTrabalhoSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  const { descricaoLivre, areasFoco, resumo, origem } = resultado.data;

  try {
    const validado = validarPerfilTrabalho(JSON.stringify({ areasFoco, resumo }));

    const perfilParaSalvar = {
      descricaoLivre,
      areasFoco: validado.areasFoco,
      resumo: validado.resumo,
      origem,
      geradoEm: new Date().toISOString(),
    };

    await prisma.usuario.update({ where: { id: req.usuario!.id }, data: { perfilTrabalho: perfilParaSalvar } });

    return res.json({ perfilTrabalho: perfilParaSalvar });
  } catch (erro) {
    console.error("Erro ao confirmar perfil de trabalho:", erro);
    return res.status(500).json({ erro: "Não foi possível salvar seu perfil de trabalho agora. Tente novamente." });
  }
});

// Equipe da empresa — lista todo mundo (dono e funcionários), aberta pra
// qualquer usuário autenticado ver quem faz parte (não é dado sensível
// dentro da própria empresa); só GERENCIAR (convidar/revogar/desativar)
// exige ser dono, via `exigirDono` abaixo.
router.get("/", async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { empresaId: req.usuario!.empresaId },
      select: { id: true, nome: true, email: true, papel: true, ativo: true, cargo: true, criadoEm: true },
      orderBy: { criadoEm: "asc" },
    });
    return res.json(usuarios);
  } catch (erro) {
    console.error("Erro ao listar usuários da empresa:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar a equipe." });
  }
});

router.patch("/:id/ativo", exigirDono, async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });
  const ativo = req.body?.ativo;
  if (typeof ativo !== "boolean") return res.status(400).json({ erro: "Informe o novo status." });

  const empresaId = req.usuario!.empresaId;
  if (idResultado.data === req.usuario!.id) {
    return res.status(400).json({ erro: "Você não pode desativar a si mesmo." });
  }

  try {
    const alvo = await prisma.usuario.findFirst({ where: { id: idResultado.data, empresaId } });
    if (!alvo) return res.status(404).json({ erro: "Usuário não encontrado." });

    // Nunca deixa a empresa sem nenhum dono ativo — sem isso, um dono
    // poderia se auto-excluir do papel de gestão sem querer e travar o
    // próprio acesso de convidar/gerenciar gente para sempre.
    if (!ativo && alvo.papel === "DONO") {
      const outrosDonosAtivos = await prisma.usuario.count({
        where: { empresaId, papel: "DONO", ativo: true, id: { not: alvo.id } },
      });
      if (outrosDonosAtivos === 0) {
        return res.status(400).json({ erro: "A empresa precisa de ao menos um dono ativo." });
      }
    }

    const usuario = await prisma.usuario.update({ where: { id: alvo.id }, data: { ativo } });

    registrarEvento({
      empresaId,
      tipo: ativo ? "USUARIO_REATIVADO" : "USUARIO_DESATIVADO",
      entidadeTipo: "Usuario",
      entidadeId: usuario.id,
      descricao: `${usuario.nome} foi ${ativo ? "reativado" : "desativado"}.`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    return res.json({ id: usuario.id, ativo: usuario.ativo });
  } catch (erro) {
    console.error("Erro ao atualizar status do usuário:", erro);
    return res.status(500).json({ erro: "Não foi possível atualizar o usuário." });
  }
});

router.get("/convites", exigirDono, async (req, res) => {
  try {
    const convites = await prisma.conviteUsuario.findMany({
      where: { empresaId: req.usuario!.empresaId, aceitoEm: null, revogadoEm: null },
      select: { id: true, email: true, papel: true, criadoEm: true, expiraEm: true },
      orderBy: { criadoEm: "desc" },
    });
    return res.json(convites);
  } catch (erro) {
    console.error("Erro ao listar convites:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar os convites." });
  }
});

// Mesmo limitador da aceitação de convite (compartilha o contador por IP) —
// mesmo sendo uma rota autenticada, sem isso uma conta comprometida (ou de
// plano PRO, sem teto de usuários) poderia disparar e-mails de convite sem
// limite nenhum, gerando custo e risco de a caixa de envio ser marcada como
// spam (ver seção de abuso do roadmap).
router.post("/convites", limiteConvite, exigirDono, async (req, res) => {
  const resultado = criarConviteSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  const empresaId = req.usuario!.empresaId;

  try {
    const empresa = await prisma.empresa.findUniqueOrThrow({
      where: { id: empresaId },
      select: { id: true, nome: true, planoTipo: true, trialBonusAteEm: true },
    });

    const limiteExcedido = await verificarLimite(empresa, "usuarios");
    if (limiteExcedido) {
      return res.status(403).json({ erro: mensagemLimiteExcedido(limiteExcedido), codigo: "LIMITE_PLANO", ...limiteExcedido });
    }

    const jaEhUsuario = await prisma.usuario.findUnique({ where: { email: resultado.data.email } });
    if (jaEhUsuario) {
      return res.status(409).json({ erro: "Já existe uma conta com este e-mail." });
    }
    const conviteExistente = await prisma.conviteUsuario.findFirst({
      where: { empresaId, email: resultado.data.email, aceitoEm: null, revogadoEm: null, expiraEm: { gt: new Date() } },
    });
    if (conviteExistente) {
      return res.status(409).json({ erro: "Já existe um convite pendente para este e-mail." });
    }

    const tokenBruto = gerarTokenConviteBruto();
    const convite = await prisma.conviteUsuario.create({
      data: {
        empresaId,
        email: resultado.data.email,
        papel: resultado.data.papel,
        tokenHash: hashTokenConvite(tokenBruto),
        expiraEm: expiracaoConvite(),
        convidadoPorId: req.usuario!.id,
      },
    });

    const link = `${frontendUrlPrincipal}/aceitar-convite?token=${tokenBruto}`;
    enviarEmail({
      para: resultado.data.email,
      assunto: `Você foi convidado para a equipe da ${empresa.nome} no MOVA`,
      textoSimples: `Você foi convidado a entrar na equipe da ${empresa.nome} no MOVA. Acesse o link abaixo para criar sua conta (válido por 7 dias):\n\n${link}\n\nSe você não esperava este convite, pode ignorar este e-mail.`,
      textoHtml: `
        <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1c2020;">
          <p style="margin:0 0 24px;font-size:20px;font-weight:700;letter-spacing:-0.01em;color:#12403d;">MOVA</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Você foi convidado a entrar na equipe da <b>${escaparHtml(empresa.nome)}</b> no MOVA.</p>
          <p style="margin:0 0 24px;">
            <a href="${link}" style="display:inline-block;background-color:#14615c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:8px;">Aceitar convite</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#5b6565;">Se o botão não funcionar, copie e cole este link no navegador:</p>
          <p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;color:#5b6565;">${link}</p>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#5b6565;">Se você não esperava este convite, pode ignorar este e-mail.</p>
        </div>
      `.trim(),
    }).catch((e) => console.error("Erro ao enviar e-mail de convite:", e));

    registrarEvento({
      empresaId,
      tipo: "USUARIO_CONVITE_ENVIADO",
      entidadeTipo: "ConviteUsuario",
      entidadeId: convite.id,
      descricao: `Convite enviado para ${convite.email}.`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    return res.status(201).json({ id: convite.id, email: convite.email, papel: convite.papel, expiraEm: convite.expiraEm });
  } catch (erro) {
    console.error("Erro ao criar convite:", erro);
    return res.status(500).json({ erro: "Não foi possível enviar o convite agora." });
  }
});

router.delete("/convites/:id", exigirDono, async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });

  try {
    const resultado = await prisma.conviteUsuario.updateMany({
      where: { id: idResultado.data, empresaId: req.usuario!.empresaId, aceitoEm: null, revogadoEm: null },
      data: { revogadoEm: new Date() },
    });
    if (resultado.count === 0) {
      return res.status(404).json({ erro: "Convite não encontrado ou já usado." });
    }
    return res.status(204).send();
  } catch (erro) {
    console.error("Erro ao revogar convite:", erro);
    return res.status(500).json({ erro: "Não foi possível revogar o convite." });
  }
});

export default router;
