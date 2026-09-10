import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { frontendUrlsPermitidas } from "./lib/config";
import authRoutes from "./routes/auth.routes";
import clientesRoutes from "./routes/clientes.routes";
import produtosRoutes from "./routes/produtos.routes";
import orcamentosRoutes from "./routes/orcamentos.routes";
import orcamentoPublicoRoutes from "./routes/orcamentoPublico.routes";
import empresaRoutes from "./routes/empresa.routes";
import usuariosRoutes from "./routes/usuarios.routes";
import planosRoutes from "./routes/planos.routes";
import indicacaoRoutes from "./routes/indicacao.routes";
import indicacaoClienteRoutes from "./routes/indicacaoCliente.routes";
import assinaturasRoutes from "./routes/assinaturas.routes";
import webhooksRoutes, { limiteWebhook } from "./routes/webhooks.routes";
import estoqueRoutes from "./routes/estoque.routes";
import vendasRoutes from "./routes/vendas.routes";
import pedidosRoutes from "./routes/pedidos.routes";
import devolucoesRoutes from "./routes/devolucoes.routes";
import integracoesRoutes, { callbackMercadoLivre } from "./routes/integracoes.routes";
import whatsappRoutes, { verificarWebhookWhatsApp, receberWebhookWhatsApp } from "./routes/whatsapp.routes";
import iaRoutes from "./routes/ia.routes";
import publicoRoutes from "./routes/publico.routes";
import adminAuthRoutes from "./routes/adminAuth.routes";
import adminRoutes from "./routes/admin.routes";
import buscaRoutes from "./routes/busca.routes";
import novidadesRoutes from "./routes/novidades.routes";

const app = express();

// Railway (e qualquer host atrás de proxy reverso) termina TLS e repassa a
// requisição por HTTP internamente — sem isto, req.protocol/req.ip sempre
// devolveriam o lado interno (http / IP do proxy), nunca o real. "1" confia
// só no primeiro hop (o próprio proxy da Railway), nunca em headers vindos
// direto do cliente.
app.set("trust proxy", 1);

// Em produção, a origem do frontend precisa vir explicitamente do ambiente —
// nunca cair silenciosamente para localhost, o que quebraria o CORS em
// produção de um jeito difícil de diagnosticar (parece bug no frontend).
// Aceita uma ou mais origens separadas por vírgula (ex: domínio oficial +
// domínio com "www" + URL de preview do Railway) — nunca um wildcard: cada
// origem precisa estar explicitamente listada.
if (process.env.NODE_ENV === "production" && !process.env.FRONTEND_URL) {
  throw new Error(
    "FRONTEND_URL precisa estar definida em produção (a(s) origem(ns) exata(s) do frontend, separadas por vírgula se houver mais de uma, ex: https://app.seudominio.com,https://www.app.seudominio.com)."
  );
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Requisições sem cabeçalho Origin (curl, health checks, chamadas
      // servidor-a-servidor) não são requisições de navegador sujeitas a
      // CORS — sempre permitidas aqui, sem afetar a proteção real, que é
      // aplicada pelo navegador com base neste header nas respostas.
      // `callback(null, false)` — não `callback(new Error(...))` — é a forma
      // correta de rejeitar aqui: nega os cabeçalhos de CORS sem virar um
      // 500 de erro interno; o navegador é quem efetivamente bloqueia a
      // resposta do lado do cliente por causa disso.
      callback(null, !origin || frontendUrlsPermitidas.includes(origin));
    },
  })
);
// Limite elevado (padrão do Express é 100kb) para acomodar áudio em base64
// no cadastro de catálogo por voz — ainda assim finito, nunca "sem limite".
// `verify` guarda os bytes crus do corpo em req.rawBody: necessário para
// validar a assinatura HMAC do webhook do WhatsApp (X-Hub-Signature-256),
// que é calculada sobre o payload exato recebido, não sobre o JSON já
// reserializado pelo parser.
app.use(
  express.json({
    limit: "15mb",
    verify: (req: Request, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// express.json() lança um SyntaxError (não uma rejeição HTTP) quando o corpo
// não é JSON válido — sem este handler, ele cairia no error handler genérico
// no fim do arquivo e voltaria como 500, mascarando um erro de entrada do
// cliente (400) como se fosse falha do servidor.
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ erro: "Corpo da requisição não é um JSON válido." });
  }
  next(err);
});

// Camada extra de rate limit aplicada a toda a API, além dos limites mais
// rígidos já existentes em /auth e /orcamentos-publico.
const limiteGeral = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas requisições. Tente novamente em alguns minutos." },
});
app.use(limiteGeral);

app.get("/", (_req, res) => {
  res.send("MOVA API funcionando!");
});

app.use("/auth", authRoutes);
app.use("/clientes", clientesRoutes);
app.use("/produtos", produtosRoutes);
app.use("/orcamentos", orcamentosRoutes);
app.use("/orcamentos-publico", orcamentoPublicoRoutes);
app.use("/empresa", empresaRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/planos", planosRoutes);
app.use("/indicacao", indicacaoRoutes);
app.use("/indicacoes-clientes", indicacaoClienteRoutes);
app.use("/novidades", novidadesRoutes);
app.use("/assinaturas", assinaturasRoutes);
app.use("/webhooks", webhooksRoutes);
app.use("/estoque", estoqueRoutes);
app.use("/vendas", vendasRoutes);
app.use("/pedidos", pedidosRoutes);
app.use("/devolucoes", devolucoesRoutes);
// Callback OAuth do Mercado Livre é um redirect de navegador sem
// Authorization header — precisa ficar fora do router autenticado.
app.get("/integracoes/mercado-livre/callback", callbackMercadoLivre);
app.use("/integracoes", integracoesRoutes);
app.use("/whatsapp", whatsappRoutes);
app.get("/webhooks/whatsapp", verificarWebhookWhatsApp);
app.post("/webhooks/whatsapp", limiteWebhook, receberWebhookWhatsApp);
app.use("/ia", iaRoutes);
app.use("/busca", buscaRoutes);
app.use("/publico", publicoRoutes);
// Autenticação administrativa (login) fica fora do middleware de admin — o
// resto de /admin/api exige um token administrativo válido.
app.use("/admin/auth", adminAuthRoutes);
app.use("/admin/api", adminRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
