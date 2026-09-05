import type { NextFunction, Request, Response } from "express";
import { prisma } from "./prisma";

/**
 * Catálogo central de módulos opcionais do MOVA (Etapa 5 — "cada empresa vê o
 * que precisa"). O motor do sistema tem todos os módulos; a EXPERIÊNCIA de
 * cada empresa mostra só os que fazem sentido para ela. Este arquivo é a
 * ÚNICA fonte de verdade sobre quais módulos existem, suas dependências e
 * seus textos — nunca espalhar essa lista em outros arquivos.
 *
 * Módulos "sempreAtivo" (clientes, produtos, orçamentos) são o núcleo do
 * MOVA: aparecem sempre, não podem ser desativados, e por isso nem entram na
 * lista `modulosAtivos` da empresa (economiza espaço e evita um estado
 * inválido "núcleo desativado").
 *
 * Agenda e Financeiro completo ainda NÃO existem como funcionalidades reais
 * no MOVA (Financeiro hoje é só preparação — ver Etapa 3) — por isso entram
 * aqui com `implementado: false`: aparecem no catálogo para transparência
 * sobre o roadmap, mas nunca podem ser ativados nem gatekeepam nada ainda,
 * porque não existe nada real por trás deles (nunca fabricar um toggle para
 * uma funcionalidade que não existe).
 */
export interface DefinicaoModulo {
  id: string;
  nome: string;
  descricao: string;
  /// Módulos que precisam estar ativos para este poder ser ativado.
  dependeDe: string[];
  sempreAtivo?: boolean;
  implementado: boolean;
}

export const MODULOS: Record<string, DefinicaoModulo> = {
  clientes: {
    id: "clientes",
    nome: "Clientes",
    descricao: "Cadastro de clientes e histórico de relacionamento.",
    dependeDe: [],
    sempreAtivo: true,
    implementado: true,
  },
  produtos: {
    id: "produtos",
    nome: "Produtos e serviços",
    descricao: "Catálogo do que sua empresa vende ou presta.",
    dependeDe: [],
    sempreAtivo: true,
    implementado: true,
  },
  orcamentos: {
    id: "orcamentos",
    nome: "Orçamentos",
    descricao: "Monte e envie orçamentos para seus clientes.",
    dependeDe: [],
    sempreAtivo: true,
    implementado: true,
  },
  estoque: {
    id: "estoque",
    nome: "Controle de estoque",
    descricao: "Controle produtos, entradas, saídas e estoque mínimo por local.",
    dependeDe: ["produtos"],
    implementado: true,
  },
  vendas: {
    id: "vendas",
    nome: "Vendas",
    descricao: "Registre vendas concluídas e acompanhe devoluções.",
    dependeDe: ["produtos"],
    implementado: true,
  },
  pedidos: {
    id: "pedidos",
    nome: "Pedidos",
    descricao: "Organize pedidos recebidos antes de virarem uma venda.",
    dependeDe: ["produtos"],
    implementado: true,
  },
  whatsapp: {
    id: "whatsapp",
    nome: "WhatsApp",
    descricao: "Converse com clientes e receba pedidos pelo WhatsApp.",
    dependeDe: [],
    implementado: true,
  },
  mercadolivre: {
    id: "mercadolivre",
    nome: "Mercado Livre",
    descricao: "Sincronize seus anúncios e pedidos do Mercado Livre.",
    dependeDe: ["produtos"],
    implementado: true,
  },
  ia: {
    id: "ia",
    nome: "Inteligência artificial",
    descricao: "Sugestões, respostas e automações inteligentes do MOVA.",
    dependeDe: [],
    implementado: true,
  },
  agenda: {
    id: "agenda",
    nome: "Agenda",
    descricao: "Em breve: organize horários e compromissos.",
    dependeDe: [],
    implementado: false,
  },
  financeiro: {
    id: "financeiro",
    nome: "Financeiro",
    descricao: "Em breve: controle financeiro completo.",
    dependeDe: [],
    implementado: false,
  },
};

/// Módulos opcionais (implementados, não-núcleo) ativos por padrão para
/// empresas que nunca configuraram nada — nunca remove de repente algo que
/// uma empresa já vinha usando antes deste recurso existir.
const MODULOS_PADRAO: string[] = Object.values(MODULOS)
  .filter((m) => m.implementado && !m.sempreAtivo)
  .map((m) => m.id);

function listaValida(valor: unknown): string[] {
  if (!Array.isArray(valor)) return MODULOS_PADRAO;
  return valor.filter((v): v is string => typeof v === "string" && v in MODULOS && MODULOS[v].implementado && !MODULOS[v].sempreAtivo);
}

/**
 * Devolve o conjunto de módulos OPCIONAIS ativos para uma empresa (nunca
 * inclui os `sempreAtivo`, que estão sempre disponíveis independentemente
 * desta lista). Trata `null`/formato inválido como "usar o padrão" — nunca
 * quebra por dado ausente ou malformado.
 */
export function modulosAtivos(modulosAtivosCru: unknown): Set<string> {
  return new Set(listaValida(modulosAtivosCru));
}

/// Verdadeiro se o módulo `id` está disponível para a empresa — módulos
/// sempreAtivo são sempre true; os demais dependem da configuração salva.
export function moduloEstaAtivo(ativos: Set<string>, id: string): boolean {
  const modulo = MODULOS[id];
  if (!modulo || !modulo.implementado) return false;
  if (modulo.sempreAtivo) return true;
  return ativos.has(id);
}

export interface ResultadoAlteracaoModulo {
  ok: boolean;
  erro?: string;
}

/**
 * Valida e aplica a ativação/desativação de UM módulo para uma empresa,
 * checando dependências nos dois sentidos:
 * - ativar X exige que toda dependência de X já esteja ativa;
 * - desativar X é bloqueado se algum OUTRO módulo ativo depende de X.
 * Nunca apaga dado nenhum — só muda quais módulos aparecem na experiência.
 */
export async function alterarModuloEmpresa(empresaId: string, moduloId: string, ativar: boolean): Promise<ResultadoAlteracaoModulo> {
  const modulo = MODULOS[moduloId];
  if (!modulo || !modulo.implementado) {
    return { ok: false, erro: "Módulo desconhecido ou ainda não disponível." };
  }
  if (modulo.sempreAtivo) {
    return { ok: false, erro: `"${modulo.nome}" é um recurso essencial do MOVA e não pode ser desativado.` };
  }

  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: empresaId }, select: { modulosAtivos: true } });
  const atual = modulosAtivos(empresa.modulosAtivos);

  if (ativar) {
    const faltando = modulo.dependeDe.filter((dep) => !moduloEstaAtivo(atual, dep));
    if (faltando.length > 0) {
      const nomes = faltando.map((id) => MODULOS[id]?.nome ?? id).join(", ");
      return { ok: false, erro: `Para ativar "${modulo.nome}", ative primeiro: ${nomes}.` };
    }
    atual.add(moduloId);
  } else {
    const dependentesAtivos = Object.values(MODULOS).filter(
      (m) => m.implementado && !m.sempreAtivo && m.id !== moduloId && m.dependeDe.includes(moduloId) && atual.has(m.id)
    );
    if (dependentesAtivos.length > 0) {
      const nomes = dependentesAtivos.map((m) => m.nome).join(", ");
      return { ok: false, erro: `Desative primeiro: ${nomes} (depende${dependentesAtivos.length > 1 ? "m" : ""} de "${modulo.nome}").` };
    }
    atual.delete(moduloId);
  }

  await prisma.empresa.update({ where: { id: empresaId }, data: { modulosAtivos: Array.from(atual) } });
  return { ok: true };
}

/**
 * Middleware Express que bloqueia toda a rota se o módulo `moduloId` não
 * estiver ativo para a empresa autenticada — a defesa de verdade contra um
 * módulo desativado (esconder no frontend nunca é suficiente: um usuário
 * pode chamar a API diretamente). Precisa vir DEPOIS de `autenticar` no
 * router (depende de `req.usuario`).
 */
export function exigirModulo(moduloId: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const empresa = await prisma.empresa.findUniqueOrThrow({
        where: { id: req.usuario!.empresaId },
        select: { modulosAtivos: true },
      });
      if (!moduloEstaAtivo(modulosAtivos(empresa.modulosAtivos), moduloId)) {
        const nome = MODULOS[moduloId]?.nome ?? moduloId;
        return res.status(403).json({ erro: `O módulo "${nome}" não está ativo para sua empresa.`, codigo: "MODULO_INATIVO" });
      }
      return next();
    } catch (erro) {
      console.error("Erro ao verificar módulo ativo:", erro);
      return res.status(500).json({ erro: "Não foi possível verificar o módulo." });
    }
  };
}
