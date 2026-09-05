import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { ApiError, iaApi } from "../../lib/api";
import type { ItemPrioridade, TipoPrioridade } from "../../lib/api";

const CORES_URGENCIA: Record<ItemPrioridade["urgencia"], string> = {
  alta: "bg-danger-600",
  media: "bg-warning-600",
  baixa: "bg-ink-300",
};

const LINK_POR_TIPO: Partial<Record<TipoPrioridade, (entidadeId: string) => string>> = {
  ORCAMENTO_PARADO: (id) => `/orcamentos/${id}`,
  CLIENTE_INATIVO: () => `/clientes`,
  DEVOLUCAO_PENDENTE: () => `/operacoes?aba=devolucoes`,
  ESTOQUE_BAIXO: () => `/operacoes?aba=estoque`,
  ESTOQUE_ZERADO: () => `/operacoes?aba=estoque`,
  INTEGRACAO_COM_ERRO: () => `/configuracoes`,
};

// Rótulo da ação rápida — visível e específico por tipo, em vez de deixar a
// linha inteira como um link "invisível" sem indicar o que vai acontecer.
const ACAO_POR_TIPO: Partial<Record<TipoPrioridade, string>> = {
  ORCAMENTO_PARADO: "Ver orçamento",
  CLIENTE_INATIVO: "Ver clientes",
  DEVOLUCAO_PENDENTE: "Ver devolução",
  ESTOQUE_BAIXO: "Ver estoque",
  ESTOQUE_ZERADO: "Ver estoque",
  INTEGRACAO_COM_ERRO: "Ver integrações",
};

/**
 * "O que precisa da sua atenção?" — mostra só as prioridades mais urgentes
 * (nunca dezenas de cards). Dados 100% determinísticos (sem custo de IA);
 * o botão "Pedir um resumo" usa a capacidade de IA "resumo_prioridades"
 * só para explicar em linguagem simples, nunca para inventar itens novos.
 */
export function CentralPrioridadesCard() {
  const [itens, setItens] = useState<ItemPrioridade[] | null>(null);
  const [temResumoIA, setTemResumoIA] = useState(false);
  const [resumo, setResumo] = useState<string | null>(null);
  const [carregandoResumo, setCarregandoResumo] = useState(false);
  const [erroResumo, setErroResumo] = useState<string | null>(null);
  const [limiteAtingido, setLimiteAtingido] = useState(false);

  useEffect(() => {
    iaApi
      .prioridades()
      .then((r) => setItens(r.itens))
      .catch(() => setItens([]));
    iaApi
      .capacidades()
      .then((r) => setTemResumoIA(r.capacidades.includes("resumo_prioridades")))
      .catch(() => setTemResumoIA(false));
  }, []);

  async function pedirResumo() {
    setErroResumo(null);
    setLimiteAtingido(false);
    setCarregandoResumo(true);
    try {
      const r = await iaApi.perguntar("resumo_prioridades");
      setResumo(r.resposta);
    } catch (e) {
      setErroResumo(e instanceof ApiError ? e.message : "Não foi possível pedir o resumo agora.");
      setLimiteAtingido(e instanceof ApiError && e.codigo === "IA_LIMITE_MENSAL");
    } finally {
      setCarregandoResumo(false);
    }
  }

  if (itens === null) {
    return (
      <Card>
        <Skeleton className="h-24" />
      </Card>
    );
  }

  if (itens.length === 0) {
    return (
      <Card>
        <CardHeader titulo="O que precisa da sua atenção" descricao="Nada urgente no momento — tudo em dia." />
      </Card>
    );
  }

  const principais = itens.slice(0, 5);
  const restantes = itens.length - principais.length;

  return (
    <Card>
      <CardHeader titulo="O que precisa da sua atenção" descricao="As prioridades mais relevantes agora, calculadas a partir dos seus dados." />
      <ul className="mt-3 flex flex-col gap-2.5">
        {principais.map((item, indice) => {
          // Alguns tipos (estoque baixo/zerado, integração com erro) sempre
          // resolvem para uma rota fixa (não usam o id) — não têm
          // entidadeId, mas ainda assim precisam de um link. Corrige um caso
          // em que esses tipos nunca ganhavam ação nenhuma antes.
          const link = LINK_POR_TIPO[item.tipo]?.(item.entidadeId ?? "");
          const acao = ACAO_POR_TIPO[item.tipo];
          const conteudo = (
            <div className="flex items-start gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-ink-50">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${CORES_URGENCIA[item.urgencia]}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-900">{item.titulo}</p>
                <p className="text-sm text-ink-500">{item.descricao}</p>
              </div>
              {link && acao && (
                <span className="mt-0.5 shrink-0 text-sm font-medium text-brand-600 whitespace-nowrap">{acao}</span>
              )}
            </div>
          );
          return <li key={indice}>{link ? <Link to={link}>{conteudo}</Link> : conteudo}</li>;
        })}
      </ul>
      {restantes > 0 && <p className="mt-2 text-xs text-ink-400">+ {restantes} outro(s) item(ns) de menor urgência.</p>}

      {temResumoIA && (
        <div className="mt-4 border-t border-ink-100 pt-3">
          {erroResumo && !limiteAtingido && (
            <div className="mb-2">
              <Alert tipo="erro">{erroResumo}</Alert>
            </div>
          )}
          {limiteAtingido && (
            <div className="mb-2">
              <Alert tipo="aviso">Seu plano atingiu o limite deste recurso de IA este mês.</Alert>
            </div>
          )}
          {resumo ? (
            <div className="rounded-lg bg-brand-50 p-3 text-sm text-brand-900">{resumo}</div>
          ) : (
            <Button tamanho="sm" variante="secundario" onClick={pedirResumo} carregando={carregandoResumo}>
              Pedir um resumo em linguagem simples
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
