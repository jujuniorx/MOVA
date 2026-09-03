import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes";
import clientesRoutes from "./routes/clientes.routes";
import produtosRoutes from "./routes/produtos.routes";
import orcamentosRoutes from "./routes/orcamentos.routes";
import orcamentoPublicoRoutes from "./routes/orcamentoPublico.routes";
import empresaRoutes from "./routes/empresa.routes";

const app = express();

// Em produção, a origem do frontend precisa vir explicitamente do ambiente —
// nunca cair silenciosamente para localhost, o que quebraria o CORS em
// produção de um jeito difícil de diagnosticar (parece bug no frontend).
const FRONTEND_URL = process.env.FRONTEND_URL;
if (process.env.NODE_ENV === "production" && !FRONTEND_URL) {
  throw new Error(
    "FRONTEND_URL precisa estar definida em produção (a origem exata do frontend, ex: https://app.seudominio.com)."
  );
}

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL ?? "http://localhost:5173" }));
app.use(express.json());

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
  res.send("OrçaFácil API funcionando!");
});

app.use("/auth", authRoutes);
app.use("/clientes", clientesRoutes);
app.use("/produtos", produtosRoutes);
app.use("/orcamentos", orcamentosRoutes);
app.use("/orcamentos-publico", orcamentoPublicoRoutes);
app.use("/empresa", empresaRoutes);

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
