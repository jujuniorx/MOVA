import { PlanoTipo, type Empresa, type Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type TransacaoPrisma = Prisma.TransactionClient;

export interface LimiteExcedidoInfo {
  recurso: "clientes" | "produtos" | "orcamentos";
  planoAtual: PlanoTipo;
  limiteAtual: number;
  sugestao: { planoTipo: PlanoTipo; limite: number | null; precoMensal: string } | null;
}

/**
 * Plano efetivo de uma empresa para fins de limite/recurso: o plano pago real
 * (quando a cobrança existir) tem prioridade; na ausência dele, um bônus de
 * indicação ativo (trialBonusAteEm no futuro) dá acesso aos limites do plano
 * Start. Nunca é derivado de nada que venha do frontend.
 */
export function planoEfetivo(empresa: Pick<Empresa, "planoTipo" | "trialBonusAteEm">): PlanoTipo {
  if (empresa.planoTipo !== "GRATUITO") return empresa.planoTipo;
  if (empresa.trialBonusAteEm && empresa.trialBonusAteEm.getTime() > Date.now()) {
    return "START";
  }
  return "GRATUITO";
}

const cacheConfig = new Map<PlanoTipo, { valor: Awaited<ReturnType<typeof buscarConfig>>; expiraEm: number }>();
const TTL_CACHE_MS = 30_000;

async function buscarConfig(planoTipo: PlanoTipo) {
  const config = await prisma.planoConfig.findUnique({ where: { planoTipo } });
  if (!config) {
    throw new Error(`Configuração do plano ${planoTipo} não encontrada — verifique o seed de PlanoConfig.`);
  }
  return config;
}

/** Pequeno cache em memória (30s) — configuração de plano muda raramente e é lida em toda criação de recurso. */
export async function obterConfigPlano(planoTipo: PlanoTipo) {
  const cache = cacheConfig.get(planoTipo);
  if (cache && cache.expiraEm > Date.now()) return cache.valor;
  const valor = await buscarConfig(planoTipo);
  cacheConfig.set(planoTipo, { valor, expiraEm: Date.now() + TTL_CACHE_MS });
  return valor;
}

/**
 * Verifica se a empresa pode criar mais um recurso do tipo informado.
 * Lança nunca — devolve null se pode criar, ou as infos do limite excedido
 * (já com a sugestão de upgrade) se não pode. A rota decide o status/JSON.
 */
export async function verificarLimite(
  empresa: Pick<Empresa, "id" | "planoTipo" | "trialBonusAteEm">,
  recurso: "clientes" | "produtos" | "orcamentos"
): Promise<LimiteExcedidoInfo | null> {
  const efetivo = planoEfetivo(empresa);
  const config = await obterConfigPlano(efetivo);

  const limiteCampo =
    recurso === "clientes" ? config.limiteClientes : recurso === "produtos" ? config.limiteProdutos : config.limiteOrcamentos;

  if (limiteCampo === null) return null; // ilimitado neste plano

  let contagemAtual: number;
  if (recurso === "orcamentos" && config.limiteOrcamentosMensal) {
    const agora = new Date();
    const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    contagemAtual = await prisma.orcamento.count({
      where: { empresaId: empresa.id, criadoEm: { gte: inicioDoMes } },
    });
  } else if (recurso === "clientes") {
    contagemAtual = await prisma.cliente.count({ where: { empresaId: empresa.id } });
  } else if (recurso === "produtos") {
    contagemAtual = await prisma.produto.count({ where: { empresaId: empresa.id } });
  } else {
    contagemAtual = await prisma.orcamento.count({ where: { empresaId: empresa.id } });
  }

  if (contagemAtual < limiteCampo) return null;

  const proximoPlano = sugerirProximoPlano(efetivo);
  let sugestao: LimiteExcedidoInfo["sugestao"] = null;
  if (proximoPlano) {
    const configProximo = await obterConfigPlano(proximoPlano);
    const limiteProximo =
      recurso === "clientes"
        ? configProximo.limiteClientes
        : recurso === "produtos"
          ? configProximo.limiteProdutos
          : configProximo.limiteOrcamentos;
    sugestao = { planoTipo: proximoPlano, limite: limiteProximo, precoMensal: configProximo.precoMensal.toString() };
  }

  return { recurso, planoAtual: efetivo, limiteAtual: limiteCampo, sugestao };
}

function sugerirProximoPlano(atual: PlanoTipo): PlanoTipo | null {
  if (atual === "GRATUITO") return "START";
  if (atual === "START") return "BUSINESS";
  if (atual === "BUSINESS") return "PRO";
  return null;
}

const NOMES_PLANO: Record<PlanoTipo, string> = {
  GRATUITO: "acesso gratuito",
  START: "MOVA Start",
  BUSINESS: "MOVA Business",
  PRO: "MOVA Pro",
};

const NOMES_RECURSO: Record<LimiteExcedidoInfo["recurso"], string> = {
  clientes: "clientes",
  produtos: "produtos",
  orcamentos: "orçamentos",
};

/** Monta a mensagem completa de upsell já pronta para exibir ao usuário. */
export function mensagemLimiteExcedido(info: LimiteExcedidoInfo): string {
  const base = `Você atingiu o limite de ${info.limiteAtual} ${NOMES_RECURSO[info.recurso]} do ${NOMES_PLANO[info.planoAtual]}.`;
  if (!info.sugestao) return base;
  const limiteTexto = info.sugestao.limite === null ? "ilimitados" : `até ${info.sugestao.limite}`;
  return `${base} No ${NOMES_PLANO[info.sugestao.planoTipo]} você pode cadastrar ${limiteTexto} ${NOMES_RECURSO[info.recurso]}.`;
}

/**
 * Progressão de dias de bônus por indicações válidas — passo a passo exato
 * definido pelo produto: 7 / 14 / 21 / 28 / 30 (não é simplesmente n×7: a
 * 5ª indicação soma só +2, não +7, para fechar em 30, e a 6ª em diante não
 * soma mais nada). O ciclo nunca reinicia — dias já concedidos não somem.
 */
const TOTAL_DIAS_POR_INDICACOES: Record<number, number> = { 0: 0, 1: 7, 2: 14, 3: 21, 4: 28, 5: 30 };

export function totalDiasIndicador(quantidadeIndicacoesValidas: number): number {
  const n = Math.min(Math.max(quantidadeIndicacoesValidas, 0), 5);
  return TOTAL_DIAS_POR_INDICACOES[n];
}

/** Bônus único (não progressivo) concedido a quem foi indicado, ao ativar. */
export const DIAS_BONUS_INDICADO = 14;

/**
 * Estende trialBonusAteEm por `dias` a partir do maior entre "agora" e o
 * valor atual — nunca reinicia nem reduz um bônus já concedido. Deve ser
 * chamada dentro de uma transação Prisma (`tx`) pelo chamador.
 */
export async function concederDiasBonus(
  tx: TransacaoPrisma,
  empresaId: string,
  dias: number
): Promise<void> {
  if (dias <= 0) return;
  const empresa = await tx.empresa.findUniqueOrThrow({ where: { id: empresaId }, select: { trialBonusAteEm: true } });
  const agora = new Date();
  const base = empresa.trialBonusAteEm && empresa.trialBonusAteEm.getTime() > agora.getTime() ? empresa.trialBonusAteEm : agora;
  const novaData = new Date(base.getTime() + dias * 24 * 60 * 60 * 1000);
  await tx.empresa.update({ where: { id: empresaId }, data: { trialBonusAteEm: novaData } });
}

/** Gera um código de indicação curto, maiúsculo, sem caracteres ambíguos (0/O, 1/I). */
export function gerarCodigoIndicacaoCandidato(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "";
  for (let i = 0; i < 7; i++) {
    codigo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return codigo;
}
