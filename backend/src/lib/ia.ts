import type { PlanoTipo } from "@prisma/client";
import { prisma } from "./prisma";

// Único lugar do MOVA onde nomes de modelo de IA aparecem — trocar de
// provedor/modelo no futuro é editar só este arquivo (ou as env vars),
// nunca procurar por strings de modelo espalhadas nas rotas.
const MODELO_SIMPLES = process.env.IA_MODEL_SIMPLES || "claude-haiku-4-5-20251001";
const MODELO_COMPLEXO = process.env.IA_MODEL_COMPLEXO || "claude-sonnet-5";

export function iaConfigurada(): boolean {
  return Boolean(process.env.IA_API_KEY);
}

export type CapacidadeIA =
  | "produtos_mais_vendidos"
  | "produtos_estoque_baixo"
  | "comparativo_vendas_3_meses"
  | "clientes_top"
  | "rascunhar_mensagem_cliente"
  | "rascunhar_orcamento";

// Capacidades "simples" (leitura de dados agregados) usam o modelo mais
// barato; só as de redação livre usam o modelo mais caro.
const MODELO_POR_CAPACIDADE: Record<CapacidadeIA, string> = {
  produtos_mais_vendidos: MODELO_SIMPLES,
  produtos_estoque_baixo: MODELO_SIMPLES,
  comparativo_vendas_3_meses: MODELO_SIMPLES,
  clientes_top: MODELO_SIMPLES,
  rascunhar_mensagem_cliente: MODELO_COMPLEXO,
  rascunhar_orcamento: MODELO_COMPLEXO,
};

const CAPACIDADES_POR_PLANO: Record<PlanoTipo, CapacidadeIA[]> = {
  GRATUITO: [],
  START: [],
  BUSINESS: ["produtos_mais_vendidos", "produtos_estoque_baixo", "rascunhar_mensagem_cliente"],
  PRO: [
    "produtos_mais_vendidos",
    "produtos_estoque_baixo",
    "comparativo_vendas_3_meses",
    "clientes_top",
    "rascunhar_mensagem_cliente",
    "rascunhar_orcamento",
  ],
};

export function capacidadesDisponiveis(planoTipo: PlanoTipo): CapacidadeIA[] {
  return CAPACIDADES_POR_PLANO[planoTipo] ?? [];
}

const LIMITE_MENSAL_BUSINESS = 100;

/** Business tem uso limitado por mês; Pro não tem teto artificial (mas todo uso é sempre registrado). */
export async function limiteMensalExcedido(empresaId: string, planoTipo: PlanoTipo): Promise<boolean> {
  if (planoTipo !== "BUSINESS") return false;
  const inicioDoMes = new Date();
  inicioDoMes.setDate(1);
  inicioDoMes.setHours(0, 0, 0, 0);
  const contagem = await prisma.usoIA.count({ where: { empresaId, criadoEm: { gte: inicioDoMes } } });
  return contagem >= LIMITE_MENSAL_BUSINESS;
}

/**
 * Cada função abaixo busca APENAS o resumo agregado necessário — nunca linhas
 * inteiras do banco, nunca dados de outra empresa, nunca campos sensíveis
 * (preços de custo internos, dados de outros clientes fora do recorte, etc).
 * O resultado vira o "contexto" que vai para o modelo — nunca a query em si.
 */
async function buscarProdutosMaisVendidos(empresaId: string) {
  const agrupado = await prisma.itemVenda.groupBy({
    by: ["produtoId"],
    where: { venda: { empresaId, status: "CONFIRMADA" } },
    _sum: { quantidade: true },
    orderBy: { _sum: { quantidade: "desc" } },
    take: 5,
  });
  const produtos = await prisma.produto.findMany({
    where: { id: { in: agrupado.map((a) => a.produtoId) } },
    select: { id: true, nome: true },
  });
  const nomePorId = new Map(produtos.map((p) => [p.id, p.nome]));
  return agrupado.map((a) => ({ produto: nomePorId.get(a.produtoId) ?? "Produto removido", quantidadeVendida: Number(a._sum.quantidade ?? 0) }));
}

async function buscarProdutosEstoqueBaixo(empresaId: string) {
  const produtos = await prisma.produto.findMany({
    where: { empresaId, controlaEstoque: true, ativo: true },
    select: { id: true, nome: true, estoqueMinimo: true, estoqueLocais: { select: { quantidade: true } } },
  });
  return produtos
    .map((p) => ({ produto: p.nome, disponivel: p.estoqueLocais.reduce((s, e) => s + e.quantidade, 0), minimo: p.estoqueMinimo }))
    .filter((p) => p.minimo !== null && p.disponivel <= p.minimo);
}

async function buscarComparativoVendas3Meses(empresaId: string) {
  const agora = new Date();
  const resultado: { mes: string; total: number }[] = [];
  for (let i = 2; i >= 0; i--) {
    const inicio = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const fim = new Date(agora.getFullYear(), agora.getMonth() - i + 1, 1);
    const vendas = await prisma.venda.aggregate({
      where: { empresaId, status: "CONFIRMADA", criadoEm: { gte: inicio, lt: fim } },
      _sum: { total: true },
    });
    resultado.push({ mes: inicio.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }), total: Number(vendas._sum.total ?? 0) });
  }
  return resultado;
}

async function buscarClientesTop(empresaId: string) {
  const agrupado = await prisma.venda.groupBy({
    by: ["clienteId"],
    where: { empresaId, status: "CONFIRMADA", clienteId: { not: null } },
    _sum: { total: true },
    orderBy: { _sum: { total: "desc" } },
    take: 5,
  });
  const clientes = await prisma.cliente.findMany({
    where: { id: { in: agrupado.map((a) => a.clienteId!).filter(Boolean) } },
    select: { id: true, nome: true },
  });
  const nomePorId = new Map(clientes.map((c) => [c.id, c.nome]));
  return agrupado.map((a) => ({ cliente: nomePorId.get(a.clienteId!) ?? "Cliente removido", totalComprado: Number(a._sum.total ?? 0) }));
}

interface ContextoRascunho {
  clienteNome?: string;
  observacoes?: string;
}

interface ChamadaIAResultado {
  texto: string;
  modelo: string;
  tokensEntrada?: number;
  tokensSaida?: number;
}

/** Único ponto que efetivamente fala com o provedor de IA (Anthropic Messages API). */
async function chamarModelo(modelo: string, prompt: string): Promise<ChamadaIAResultado> {
  const apiKey = process.env.IA_API_KEY;
  if (!apiKey) {
    throw new Error("Integração de IA não configurada — defina IA_API_KEY no .env.");
  }

  const resposta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(`Falha ao chamar o modelo de IA (status ${resposta.status}): ${corpo}`);
  }

  const dados = (await resposta.json()) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const texto = dados.content?.find((b) => b.type === "text")?.text ?? "";
  return { texto, modelo, tokensEntrada: dados.usage?.input_tokens, tokensSaida: dados.usage?.output_tokens };
}

/**
 * Ponto único de entrada de todas as capacidades de IA. A capacidade decide
 * QUAIS dados são buscados (sempre um recorte mínimo e já resumido) — a IA
 * nunca recebe acesso direto ao banco nem credenciais, só o texto final do
 * prompt já pronto. Retorna também o que deve ser gravado em UsoIA.
 */
export async function executarCapacidadeIA(
  empresaId: string,
  capacidade: CapacidadeIA,
  contexto?: ContextoRascunho
): Promise<ChamadaIAResultado> {
  const modelo = MODELO_POR_CAPACIDADE[capacidade];
  let prompt: string;

  switch (capacidade) {
    case "produtos_mais_vendidos": {
      const dados = await buscarProdutosMaisVendidos(empresaId);
      prompt = `Você é um assistente de negócios do MOVA. Com base nestes dados de vendas (produto e quantidade vendida), escreva um resumo curto e útil em português para o dono do negócio:\n${JSON.stringify(dados)}`;
      break;
    }
    case "produtos_estoque_baixo": {
      const dados = await buscarProdutosEstoqueBaixo(empresaId);
      prompt = `Você é um assistente de negócios do MOVA. Estes produtos estão com estoque baixo ou zerado (produto, disponível, mínimo configurado). Escreva um alerta curto e uma recomendação de reposição em português:\n${JSON.stringify(dados)}`;
      break;
    }
    case "comparativo_vendas_3_meses": {
      const dados = await buscarComparativoVendas3Meses(empresaId);
      prompt = `Você é um assistente de negócios do MOVA. Compare o total vendido nestes últimos 3 meses e comente a tendência em português, de forma direta:\n${JSON.stringify(dados)}`;
      break;
    }
    case "clientes_top": {
      const dados = await buscarClientesTop(empresaId);
      prompt = `Você é um assistente de negócios do MOVA. Estes são os clientes que mais compraram (nome e total comprado). Escreva um resumo curto em português:\n${JSON.stringify(dados)}`;
      break;
    }
    case "rascunhar_mensagem_cliente": {
      prompt = `Escreva uma mensagem curta, cordial e profissional em português para enviar a um cliente${contexto?.clienteNome ? ` chamado ${contexto.clienteNome}` : ""}. Contexto/observações do usuário: ${contexto?.observacoes ?? "nenhuma"}. Não invente promessas, preços ou prazos que não foram informados.`;
      break;
    }
    case "rascunhar_orcamento": {
      prompt = `Escreva uma descrição curta e profissional para um item de orçamento, em português, com base nestas observações do usuário: ${contexto?.observacoes ?? "nenhuma"}. Não invente valores.`;
      break;
    }
    default:
      throw new Error(`Capacidade de IA não reconhecida: ${capacidade}`);
  }

  return chamarModelo(modelo, prompt);
}
