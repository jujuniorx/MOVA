import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { montarUrlAutorizacao, trocarCodigoPorToken, mercadoLivreConfigurado } from "../lib/mercadoLivre";
import { processarNotificacaoMercadoLivre } from "../lib/mercadoLivreSync";
import { cifrar } from "../lib/crypto";
import { registrarEvento } from "../lib/historico";
import { idParamSchema } from "../schemas/common.schema";
import { exigirModulo } from "../lib/modulos";
import { frontendUrlPrincipal } from "../lib/config";

const router = Router();

router.use(autenticar);
// O callback OAuth (`callbackMercadoLivre`) fica fora deste router (é
// montado à parte em server.ts, sem autenticação — é um redirect do
// navegador vindo do Mercado Livre) e por isso nunca é afetado por este
// bloqueio.
router.use(exigirModulo("mercadolivre"));

// `state` carrega o empresaId assinado com o próprio JWT_SECRET (HMAC) para
// que o callback (que não tem o usuário autenticado — é um redirect do ML)
// consiga identificar com segurança de qual empresa é esta conexão, sem
// aceitar um empresaId arbitrário vindo da query string.
function assinarState(empresaId: string): string {
  const segredo = process.env.JWT_SECRET!;
  const assinatura = crypto.createHmac("sha256", segredo).update(empresaId).digest("hex");
  return Buffer.from(`${empresaId}.${assinatura}`).toString("base64url");
}

function validarState(state: string): string | null {
  try {
    const decodificado = Buffer.from(state, "base64url").toString("utf8");
    const [empresaId, assinatura] = decodificado.split(".");
    if (!empresaId || !assinatura) return null;
    const segredo = process.env.JWT_SECRET!;
    const esperado = crypto.createHmac("sha256", segredo).update(empresaId).digest("hex");
    const bufA = Buffer.from(assinatura, "hex");
    const bufB = Buffer.from(esperado, "hex");
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) return null;
    return empresaId;
  } catch {
    return null;
  }
}

router.get("/mercado-livre/status", async (req, res) => {
  const conta = await prisma.contaMercadoLivre.findUnique({
    where: { empresaId: req.usuario!.empresaId },
    select: { mlUserId: true, conectadoEm: true, atualizadoEm: true },
  });
  return res.json({ configurado: mercadoLivreConfigurado(), conectado: Boolean(conta), conta });
});

router.get("/mercado-livre/conectar", (req, res) => {
  if (!mercadoLivreConfigurado()) {
    return res.status(503).json({ erro: "Integração com Mercado Livre não configurada neste ambiente." });
  }
  const state = assinarState(req.usuario!.empresaId);
  const url = montarUrlAutorizacao(state);
  return res.json({ url });
});

// Callback do ML é um redirect de navegador SEM Authorization header do
// MOVA — por isso a rota fica fora de `autenticar` (registrado abaixo) e a
// identidade da empresa vem exclusivamente do `state` assinado.
export const callbackMercadoLivre = async (req: import("express").Request, res: import("express").Response) => {
  const { code, state } = req.query as { code?: string; state?: string };
  if (!code || !state) {
    return res.status(400).json({ erro: "Parâmetros de callback inválidos." });
  }
  const empresaId = validarState(state);
  if (!empresaId) {
    return res.status(400).json({ erro: "State inválido ou adulterado." });
  }

  try {
    const token = await trocarCodigoPorToken(code);
    await prisma.contaMercadoLivre.upsert({
      where: { empresaId },
      create: {
        empresaId,
        mlUserId: String(token.user_id),
        accessTokenCifrado: cifrar(token.access_token),
        refreshTokenCifrado: cifrar(token.refresh_token),
        expiraEm: new Date(Date.now() + token.expires_in * 1000),
      },
      update: {
        mlUserId: String(token.user_id),
        accessTokenCifrado: cifrar(token.access_token),
        refreshTokenCifrado: cifrar(token.refresh_token),
        expiraEm: new Date(Date.now() + token.expires_in * 1000),
      },
    });

    registrarEvento({
      empresaId,
      tipo: "MERCADO_LIVRE_CONECTADO",
      entidadeTipo: "ContaMercadoLivre",
      descricao: "Conta do Mercado Livre conectada.",
    }).catch((e) => console.error("Erro ao registrar histórico:", e));

    return res.redirect(`${frontendUrlPrincipal}/configuracoes?integracao=mercado-livre&status=conectado`);
  } catch (erro) {
    console.error("Erro no callback do Mercado Livre:", erro);
    return res.redirect(`${frontendUrlPrincipal}/configuracoes?integracao=mercado-livre&status=erro`);
  }
};

// Central de problemas operacionais (recorte Mercado Livre): a notificação
// em si não tem empresaId (chega antes de sabermos de quem é) — resolvemos
// pela ContaMercadoLivre da empresa autenticada e filtramos por mlUserId,
// nunca confiando em nada vindo do cliente para decidir de quem é o quê.
router.get("/mercado-livre/notificacoes", async (req, res) => {
  const conta = await prisma.contaMercadoLivre.findUnique({ where: { empresaId: req.usuario!.empresaId } });
  if (!conta) return res.json([]);

  const somenteComErro = req.query.comErro === "true";
  const notificacoes = await prisma.notificacaoMercadoLivre.findMany({
    where: { mlUserId: conta.mlUserId, ...(somenteComErro ? { erro: { not: null } } : {}) },
    orderBy: { recebidoEm: "desc" },
    take: 100,
  });
  return res.json(notificacoes);
});

router.post("/mercado-livre/notificacoes/:id/reprocessar", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });

  const conta = await prisma.contaMercadoLivre.findUnique({ where: { empresaId: req.usuario!.empresaId } });
  if (!conta) return res.status(404).json({ erro: "Nenhuma conta do Mercado Livre conectada." });

  const notificacao = await prisma.notificacaoMercadoLivre.findFirst({
    where: { id: idResultado.data, mlUserId: conta.mlUserId },
  });
  if (!notificacao) return res.status(404).json({ erro: "Notificação não encontrada." });
  if (!notificacao.mlUserId) {
    return res.status(409).json({ erro: "Esta notificação é antiga demais para ser reprocessada automaticamente." });
  }

  await processarNotificacaoMercadoLivre({
    topico: notificacao.topico,
    recurso: notificacao.recursoId,
    mlUserId: notificacao.mlUserId,
  });

  const atualizada = await prisma.notificacaoMercadoLivre.findUnique({ where: { id: notificacao.id } });
  return res.json(atualizada);
});

router.post("/mercado-livre/desconectar", async (req, res) => {
  await prisma.contaMercadoLivre.deleteMany({ where: { empresaId: req.usuario!.empresaId } });
  registrarEvento({
    empresaId: req.usuario!.empresaId,
    tipo: "MERCADO_LIVRE_DESCONECTADO",
    entidadeTipo: "ContaMercadoLivre",
    descricao: "Conta do Mercado Livre desconectada.",
  }).catch((e) => console.error("Erro ao registrar histórico:", e));
  return res.status(204).send();
});

export default router;
