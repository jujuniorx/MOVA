import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { gerarToken } from "../lib/jwt";
import { autenticar } from "../middleware/auth.middleware";
import { empresaSelectPropria } from "../lib/empresaSelect";
import { registrarSchema, loginSchema } from "../schemas/auth.schema";
import { solicitarRecuperacaoSchema, redefinirSenhaSchema } from "../schemas/recuperacaoSenha.schema";
import { gerarCodigoIndicacaoUnico, vincularIndicacaoSeValida } from "../lib/indicacao";
import { criarTokenRecuperacao, consumirTokenRecuperacao } from "../lib/recuperacaoSenha";
import { enviarEmail, escaparHtml } from "../lib/mailer";
import { frontendUrlPrincipal } from "../lib/config";

const router = Router();

const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Tente novamente em alguns minutos." },
});

router.post("/registrar", limiteAuth, async (req, res) => {
  const resultado = registrarSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  const { nomeEmpresa, nomeUsuario, email, senha, codigoIndicacao } = resultado.data;

  try {
    const senhaHash = await bcrypt.hash(senha, 12);

    const { usuario, empresa } = await prisma.$transaction(async (tx) => {
      const codigoProprio = await gerarCodigoIndicacaoUnico(tx);
      const empresa = await tx.empresa.create({
        data: { nome: nomeEmpresa, codigoIndicacao: codigoProprio },
        select: empresaSelectPropria,
      });
      const usuario = await tx.usuario.create({
        data: { nome: nomeUsuario, email, senhaHash, empresaId: empresa.id },
      });
      await vincularIndicacaoSeValida(tx, codigoIndicacao, empresa.id);
      return { usuario, empresa };
    });

    const token = gerarToken({ sub: usuario.id, empresaId: empresa.id, email: usuario.email });

    return res.status(201).json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
      empresa,
    });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return res.status(409).json({ erro: "Este e-mail já está cadastrado." });
    }
    console.error("Erro ao registrar usuário:", erro);
    return res.status(500).json({ erro: "Não foi possível concluir o cadastro." });
  }
});

router.post("/login", limiteAuth, async (req, res) => {
  const resultado = loginSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  const { email, senha } = resultado.data;

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { empresa: { select: { ...empresaSelectPropria, suspensa: true } } },
    });

    if (!usuario) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    if (usuario.empresa.suspensa) {
      return res.status(403).json({ erro: "Esta conta está suspensa. Entre em contato com o suporte." });
    }

    if (!usuario.ativo) {
      return res.status(403).json({ erro: "Este usuário foi desativado. Entre em contato com o administrador da empresa." });
    }

    const token = gerarToken({ sub: usuario.id, empresaId: usuario.empresaId, email: usuario.email });

    return res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
      empresa: usuario.empresa,
    });
  } catch (erro) {
    console.error("Erro ao autenticar usuário:", erro);
    return res.status(500).json({ erro: "Não foi possível concluir o login." });
  }
});

// Solicitação de recuperação de senha — a resposta é SEMPRE a mesma, exista
// ou não o e-mail (nunca revela se uma conta está cadastrada, evitando
// enumeração). Mesmo limite de tentativas do login/cadastro.
router.post("/esqueci-senha", limiteAuth, async (req, res) => {
  const resultado = solicitarRecuperacaoSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  const respostaGenerica = { mensagem: "Se este e-mail estiver cadastrado, enviamos um link de recuperação." };

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email: resultado.data.email },
      select: { id: true, nome: true },
    });

    if (usuario) {
      const tokenBruto = await criarTokenRecuperacao(usuario.id);
      const link = `${frontendUrlPrincipal}/redefinir-senha?token=${tokenBruto}`;
      await enviarEmail({
        para: resultado.data.email,
        assunto: "Recuperação de senha — MOVA",
        textoSimples: `Olá, ${usuario.nome}.\n\nRecebemos um pedido para redefinir sua senha no MOVA. Acesse o link abaixo para criar uma nova senha (válido por 1 hora):\n\n${link}\n\nSe você não pediu isso, pode ignorar este e-mail — sua senha continua a mesma.`,
        // HTML de e-mail: estilos sempre inline (clientes de e-mail ignoram
        // <style> em bloco) e nunca reagem ao tema do app — um e-mail é
        // sempre "modo claro". O único dado dinâmico interpolado é o nome do
        // usuário, sempre escapado (escaparHtml) antes de entrar no HTML.
        textoHtml: `
          <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1c2020;">
            <p style="margin:0 0 24px;font-size:20px;font-weight:700;letter-spacing:-0.01em;color:#12403d;">MOVA</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Olá, ${escaparHtml(usuario.nome)}.</p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">Recebemos um pedido para redefinir sua senha no MOVA. Clique no botão abaixo para criar uma nova senha — o link é válido por 1 hora.</p>
            <p style="margin:0 0 24px;">
              <a href="${link}" style="display:inline-block;background-color:#14615c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:8px;">Criar nova senha</a>
            </p>
            <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#5b6565;">Se o botão não funcionar, copie e cole este link no navegador:</p>
            <p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;color:#5b6565;">${link}</p>
            <p style="margin:0;font-size:13px;line-height:1.5;color:#5b6565;">Se você não pediu isso, pode ignorar este e-mail — sua senha continua a mesma.</p>
          </div>
        `.trim(),
      });
    }

    return res.json(respostaGenerica);
  } catch (erro) {
    // Mesmo em erro interno, a resposta nunca muda — o que diferiria
    // observavelmente entre "e-mail existe" e "e-mail não existe" seria uma
    // enumeração de contas por efeito colateral.
    console.error("Erro ao processar solicitação de recuperação de senha:", erro);
    return res.json(respostaGenerica);
  }
});

router.post("/redefinir-senha", limiteAuth, async (req, res) => {
  const resultado = redefinirSenhaSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  try {
    const validacao = await consumirTokenRecuperacao(resultado.data.token);
    if (!validacao.ok) {
      return res.status(400).json({ erro: validacao.erro });
    }

    const senhaHash = await bcrypt.hash(resultado.data.novaSenha, 12);
    await prisma.usuario.update({
      where: { id: validacao.usuarioId! },
      data: { senhaHash, senhaAlteradaEm: new Date() },
    });

    return res.json({ mensagem: "Senha alterada com sucesso. Faça login com sua nova senha." });
  } catch (erro) {
    console.error("Erro ao redefinir senha:", erro);
    return res.status(500).json({ erro: "Não foi possível redefinir a senha agora." });
  }
});

router.get("/me", autenticar, async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario!.id },
      include: { empresa: { select: empresaSelectPropria } },
    });

    if (!usuario) {
      return res.status(401).json({ erro: "Usuário não encontrado." });
    }

    return res.json({
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
      empresa: usuario.empresa,
    });
  } catch (erro) {
    console.error("Erro ao buscar usuário autenticado:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar os dados do usuário." });
  }
});

export default router;
