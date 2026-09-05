import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
import { iaApi } from "../../lib/api";
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

/**
 * "O que precisa da sua atenção?" — mostra só as prioridades mais urgentes
 * (nunca dezenas de cards). Dados 100% determinísticos (sem custo de IA);
 * o botão "Pedir um resumo" usa a capacidade de IA "resumo_prioridades"
 * só para explicar em linguagem simples, nunca para inventar itens novos.
 */
export function CentralPrioridadesCard() {
  const [itens, setItens] = useState<ItemPrioridade[] | null>(null);

  useEffect(() => {
    iaApi
      .prioridades()
      .then((r) => setItens(r.itens))
      .catch(() => setItens([]));
  }, []);

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
          const link = item.entidadeId ? LINK_POR_TIPO[item.tipo]?.(item.entidadeId) : undefined;
          const conteudo = (
            <div className="flex items-start gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-ink-50">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${CORES_URGENCIA[item.urgencia]}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">{item.titulo}</p>
                <p className="text-sm text-ink-500">{item.descricao}</p>
              </div>
            </div>
          );
          return <li key={indice}>{link ? <Link to={link}>{conteudo}</Link> : conteudo}</li>;
        })}
      </ul>
      {restantes > 0 && <p className="mt-2 text-xs text-ink-400">+ {restantes} outro(s) item(ns) de menor urgência.</p>}
    </Card>
  );
}
