import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { gerarToken } from "../lib/jwt";
import { autenticar } from "../middleware/auth.middleware";
import { empresaSelectPropria } from "../lib/empresaSelect";
import { registrarSchema, loginSchema } from "../schemas/auth.schema";

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

  const { nomeEmpresa, nomeUsuario, email, senha } = resultado.data;

  try {
    const senhaHash = await bcrypt.hash(senha, 12);

    const { usuario, empresa } = await prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: { nome: nomeEmpresa },
        select: empresaSelectPropria,
      });
      const usuario = await tx.usuario.create({
        data: { nome: nomeUsuario, email, senhaHash, empresaId: empresa.id },
      });
      return { usuario, empresa };
    });

    const token = gerarToken({ sub: usuario.id, empresaId: empresa.id, email: usuario.email });

    return res.status(201).json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
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
      include: { empresa: { select: empresaSelectPropria } },
    });

    if (!usuario) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    const token = gerarToken({ sub: usuario.id, empresaId: usuario.empresaId, email: usuario.email });

    return res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      empresa: usuario.empresa,
    });
  } catch (erro) {
    console.error("Erro ao autenticar usuário:", erro);
    return res.status(500).json({ erro: "Não foi possível concluir o login." });
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
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      empresa: usuario.empresa,
    });
  } catch (erro) {
    console.error("Erro ao buscar usuário autenticado:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar os dados do usuário." });
  }
});

export default router;
