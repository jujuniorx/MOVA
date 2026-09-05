import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { modulosAtivos, moduloEstaAtivo } from "../lib/modulos";

const router = Router();

router.use(autenticar);

const LIMITE_POR_CATEGORIA = 5;
const TAMANHO_MIN = 2;
const TAMANHO_MAX = 100;

export interface ResultadoBusca {
  tipo: "cliente" | "produto" | "orcamento" | "venda" | "pedido";
  id: string;
  titulo: string;
  subtitulo: string;
  rota: string;
}

// Busca global — só dentro dos dados da PRÓPRIA empresa (toda consulta abaixo
// é filtrada por empresaId), e só nas categorias cujo módulo está ativo
// (vendas/pedidos são opcionais; clientes/produtos/orçamentos são núcleo,
// sempre buscáveis). Tamanho mínimo evita uma varredura ampla com 1 caractere;
// tamanho máximo e limite por categoria evitam abuso — nada aqui precisa de
// um rate limit próprio além do limite geral da API (server.ts), pensado
// para caber uma busca a cada tecla digitada.
router.get("/", async (req, res) => {
  const termoBruto = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (termoBruto.length < TAMANHO_MIN) {
    return res.json({ resultados: [] });
  }
  const termo = termoBruto.slice(0, TAMANHO_MAX);
  const empresaId = req.usuario!.empresaId;

  try {
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { modulosAtivos: true } });
    const ativos = modulosAtivos(empresa?.modulosAtivos);

    const numeroBuscado = /^\d+$/.test(termo) ? Number(termo) : null;

    const [clientes, produtos, orcamentos, vendas, pedidos] = await Promise.all([
      prisma.cliente.findMany({
        where: {
          empresaId,
          OR: [
            { nome: { contains: termo, mode: "insensitive" } },
            { telefone: { contains: termo, mode: "insensitive" } },
            { email: { contains: termo, mode: "insensitive" } },
          ],
        },
        select: { id: true, nome: true, telefone: true, email: true },
        take: LIMITE_POR_CATEGORIA,
      }),
      prisma.produto.findMany({
        where: {
          empresaId,
          OR: [{ nome: { contains: termo, mode: "insensitive" } }, { sku: { contains: termo, mode: "insensitive" } }],
        },
        select: { id: true, nome: true, sku: true, preco: true },
        take: LIMITE_POR_CATEGORIA,
      }),
      prisma.orcamento.findMany({
        where: {
          empresaId,
          OR: [
            ...(numeroBuscado !== null ? [{ numero: numeroBuscado }] : []),
            { cliente: { nome: { contains: termo, mode: "insensitive" as const } } },
          ],
        },
        select: { id: true, numero: true, total: true, status: true, cliente: { select: { nome: true } } },
        take: LIMITE_POR_CATEGORIA,
      }),
      moduloEstaAtivo(ativos, "vendas") && numeroBuscado !== null
        ? prisma.venda.findMany({
            where: { empresaId, numero: numeroBuscado },
            select: { id: true, numero: true, total: true, cliente: { select: { nome: true } } },
            take: LIMITE_POR_CATEGORIA,
          })
        : Promise.resolve([]),
      moduloEstaAtivo(ativos, "pedidos")
        ? prisma.pedido.findMany({
            where: {
              empresaId,
              OR: [
                ...(numeroBuscado !== null ? [{ numero: numeroBuscado }] : []),
                { referenciaExterna: { contains: termo, mode: "insensitive" as const } },
              ],
            },
            select: { id: true, numero: true, status: true, canal: true },
            take: LIMITE_POR_CATEGORIA,
          })
        : Promise.resolve([]),
    ]);

    const resultados: ResultadoBusca[] = [
      ...clientes.map((c): ResultadoBusca => ({
        tipo: "cliente",
        id: c.id,
        titulo: c.nome,
        subtitulo: c.telefone ?? c.email ?? "Cliente",
        rota: `/clientes?abrir=${c.id}`,
      })),
      ...produtos.map((p): ResultadoBusca => ({
        tipo: "produto",
        id: p.id,
        titulo: p.nome,
        subtitulo: p.sku ? `SKU ${p.sku}` : `R$ ${Number(p.preco).toFixed(2)}`,
        rota: `/produtos?abrir=${p.id}`,
      })),
      ...orcamentos.map((o): ResultadoBusca => ({
        tipo: "orcamento",
        id: o.id,
        titulo: `Orçamento #${o.numero}`,
        subtitulo: `${o.cliente.nome} · ${o.status}`,
        rota: `/orcamentos/${o.id}`,
      })),
      ...vendas.map((v): ResultadoBusca => ({
        tipo: "venda",
        id: v.id,
        titulo: `Venda #${v.numero}`,
        subtitulo: v.cliente?.nome ?? "Sem cliente",
        rota: `/operacoes?aba=vendas`,
      })),
      ...pedidos.map((p): ResultadoBusca => ({
        tipo: "pedido",
        id: p.id,
        titulo: `Pedido #${p.numero}`,
        subtitulo: `${p.canal} · ${p.status}`,
        rota: `/operacoes?aba=pedidos`,
      })),
    ];

    return res.json({ resultados });
  } catch (erro) {
    console.error("Erro na busca global:", erro);
    return res.status(500).json({ erro: "Não foi possível buscar agora." });
  }
});

export default router;
