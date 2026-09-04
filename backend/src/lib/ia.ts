import type { PlanoTipo } from "@prisma/client";
import { z } from "zod";
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
  | "rascunhar_orcamento"
  | "sugerir_produtos_segmento"
  | "estruturar_catalogo_texto";

// Capacidades "simples" (leitura de dados agregados, ou geração de uma lista
// curta) usam o modelo mais barato; redação livre e estruturação de texto
// mais longo (catálogo) usam o modelo mais caro.
const MODELO_POR_CAPACIDADE: Record<CapacidadeIA, string> = {
  produtos_mais_vendidos: MODELO_SIMPLES,
  produtos_estoque_baixo: MODELO_SIMPLES,
  comparativo_vendas_3_meses: MODELO_SIMPLES,
  clientes_top: MODELO_SIMPLES,
  rascunhar_mensagem_cliente: MODELO_COMPLEXO,
  rascunhar_orcamento: MODELO_COMPLEXO,
  sugerir_produtos_segmento: MODELO_SIMPLES,
  estruturar_catalogo_texto: MODELO_COMPLEXO,
};

// START tem só uma pequena amostra (sugestão de produtos por segmento, com
// teto mensal baixo) — o suficiente para o usuário sentir o valor da IA sem
// virar uma ferramenta de trabalho completa nesse plano.
const CAPACIDADES_POR_PLANO: Record<PlanoTipo, CapacidadeIA[]> = {
  GRATUITO: [],
  START: ["sugerir_produtos_segmento"],
  BUSINESS: [
    "produtos_mais_vendidos",
    "produtos_estoque_baixo",
    "rascunhar_mensagem_cliente",
    "sugerir_produtos_segmento",
    "estruturar_catalogo_texto",
  ],
  PRO: [
    "produtos_mais_vendidos",
    "produtos_estoque_baixo",
    "comparativo_vendas_3_meses",
    "clientes_top",
    "rascunhar_mensagem_cliente",
    "rascunhar_orcamento",
    "sugerir_produtos_segmento",
    "estruturar_catalogo_texto",
  ],
};

export function capacidadesDisponiveis(planoTipo: PlanoTipo): CapacidadeIA[] {
  return CAPACIDADES_POR_PLANO[planoTipo] ?? [];
}

// START: só uma amostra do valor da IA. BUSINESS: uso real de trabalho, mas
// com teto. PRO: sem teto artificial (todo uso continua registrado em UsoIA).
const LIMITE_MENSAL_POR_PLANO: Partial<Record<PlanoTipo, number>> = {
  START: 10,
  BUSINESS: 100,
};

export async function limiteMensalExcedido(empresaId: string, planoTipo: PlanoTipo): Promise<boolean> {
  const limite = LIMITE_MENSAL_POR_PLANO[planoTipo];
  if (limite === undefined) return false;
  const inicioDoMes = new Date();
  inicioDoMes.setDate(1);
  inicioDoMes.setHours(0, 0, 0, 0);
  const contagem = await prisma.usoIA.count({ where: { empresaId, criadoEm: { gte: inicioDoMes } } });
  return contagem >= limite;
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
async function chamarModelo(modelo: string, prompt: string, maxTokens = 1024): Promise<ChamadaIAResultado> {
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
      max_tokens: maxTokens,
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
    case "sugerir_produtos_segmento": {
      const descricao = contexto?.observacoes?.trim();
      if (!descricao) throw new Error("Descreva o segmento do seu negócio para receber sugestões.");
      prompt = `Um empresário brasileiro descreveu o segmento do negócio dele assim: "${descricao}".
Sugira de 6 a 15 produtos ou serviços TÍPICOS e genéricos desse segmento (nomes curtos, sem preço, sem inventar detalhes que o empresário não mencionou).
Responda SOMENTE com um JSON válido, sem texto antes ou depois, neste formato exato:
{"produtos": ["Nome do produto ou serviço 1", "Nome 2"]}`;
      break;
    }
    case "estruturar_catalogo_texto": {
      const descricao = contexto?.observacoes?.trim();
      if (!descricao) throw new Error("Descreva os produtos/serviços e preços para estruturar o catálogo.");
      prompt = `Um empresário brasileiro descreveu, em texto livre, produtos/serviços que vende e seus preços:
"${descricao}"

Estruture essas informações. Cada produto pode ter uma ou mais variações de preço (ex.: tamanhos, medidas). Se um preço ou detalhe não estiver claro no texto, NÃO invente um valor — deixe o campo "preco" como null e marque "confianca" como "baixa" para aquele item. Nunca chute um preço que não foi dito.

Responda SOMENTE com um JSON válido, sem texto antes ou depois, neste formato exato:
{"itens": [
  {"nome": "Nome do produto/serviço", "confianca": "alta"|"media"|"baixa", "variacoes": [{"nome": "descrição da variação (ex: 2 lugares)", "preco": 150.00 ou null}]}
]}
Se um item não tiver variações, use uma única variação com nome igual ao nome do produto.`;
      break;
    }
    default:
      throw new Error(`Capacidade de IA não reconhecida: ${capacidade}`);
  }

  const maxTokens = capacidade === "estruturar_catalogo_texto" ? 4096 : 1024;
  return chamarModelo(modelo, prompt, maxTokens);
}

const sugestaoSegmentoSchema = z.object({ produtos: z.array(z.string().trim().min(1)).min(1).max(30) });

const catalogoItemSchema = z.object({
  nome: z.string().trim().min(1),
  confianca: z.enum(["alta", "media", "baixa"]).optional(),
  variacoes: z
    .array(z.object({ nome: z.string().trim().min(1), preco: z.number().positive().nullable() }))
    .min(1)
    .max(20),
});
const catalogoRespostaSchema = z.object({ itens: z.array(catalogoItemSchema).min(1).max(50) });

/**
 * A IA nunca é confiável por padrão: qualquer resposta que devia vir em JSON
 * estruturado é validada aqui antes de qualquer outra camada do MOVA
 * enxergá-la. Se o modelo devolver algo fora do formato esperado — texto
 * solto, JSON incompleto, campo com tipo errado — o pedido falha
 * explicitamente em vez de tentar "adivinhar" o que ele quis dizer.
 */
function extrairJsonSeguro<T>(texto: string, schema: z.ZodType<T>): T {
  const semCercas = texto.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let bruto: unknown;
  try {
    bruto = JSON.parse(semCercas);
  } catch {
    throw new Error("A IA não conseguiu estruturar uma resposta válida. Tente descrever de outra forma.");
  }
  const validado = schema.safeParse(bruto);
  if (!validado.success) {
    throw new Error("A IA não conseguiu estruturar uma resposta válida. Tente descrever de outra forma.");
  }
  return validado.data;
}

export function validarSugestaoSegmento(texto: string) {
  return extrairJsonSeguro(texto, sugestaoSegmentoSchema);
}

export function validarCatalogoEstruturado(texto: string) {
  return extrairJsonSeguro(texto, catalogoRespostaSchema);
}

export function transcricaoConfigurada(): boolean {
  return Boolean(process.env.TRANSCRICAO_API_KEY);
}

/**
 * Transcreve áudio para texto (Whisper, via API da OpenAI) — usado no
 * cadastro de catálogo por voz. Serviço INDEPENDENTE da chave de texto
 * (IA_API_KEY): sem TRANSCRICAO_API_KEY configurada, falha de forma
 * controlada em vez de simular uma transcrição.
 */
export async function transcreverAudio(audioBase64: string, tipoMime: string): Promise<string> {
  const apiKey = process.env.TRANSCRICAO_API_KEY;
  if (!apiKey) {
    throw new Error("Transcrição de áudio não configurada — defina TRANSCRICAO_API_KEY no .env.");
  }

  const bufferAudio = Buffer.from(audioBase64, "base64");
  const extensao = tipoMime.includes("mp4") ? "mp4" : tipoMime.includes("wav") ? "wav" : tipoMime.includes("ogg") ? "ogg" : "webm";
  const formData = new FormData();
  formData.append("file", new Blob([bufferAudio], { type: tipoMime }), `audio.${extensao}`);
  formData.append("model", "whisper-1");
  formData.append("language", "pt");

  const resposta = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(`Falha ao transcrever áudio (status ${resposta.status}): ${corpo}`);
  }

  const dados = (await resposta.json()) as { text?: string };
  return dados.text ?? "";
}
