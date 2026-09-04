import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { StatusBadge } from "../components/ui/StatusBadge";
import { PageHeader } from "../components/ui/PageHeader";
import { ApiError, orcamentosApi } from "../lib/api";
import type { OrcamentoResumoItem, StatusOrcamento } from "../lib/api";
import { cn } from "../lib/cn";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

type Filtro = "todos" | StatusOrcamento;

const filtros: { rotulo: string; valor: Filtro }[] = [
  { rotulo: "Todos", valor: "todos" },
  { rotulo: "Rascunho", valor: "RASCUNHO" },
  { rotulo: "Enviado", valor: "ENVIADO" },
  { rotulo: "Aprovado", valor: "APROVADO" },
  { rotulo: "Recusado", valor: "RECUSADO" },
];

function IconeOrcamento() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
    </svg>
  );
}

export function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<OrcamentoResumoItem[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    orcamentosApi
      .listar(filtro === "todos" ? undefined : filtro)
      .then(setOrcamentos)
      .catch((erroCapturado) =>
        setErro(
          erroCapturado instanceof ApiError ? erroCapturado.message : "Não foi possível carregar os orçamentos."
        )
      )
      .finally(() => setCarregando(false));
  }, [filtro]);

  const orcamentosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return orcamentos;
    return orcamentos.filter(
      (orcamento) =>
        orcamento.cliente.nome.toLowerCase().includes(termo) || String(orcamento.numero).includes(termo)
    );
  }, [orcamentos, busca]);

  return (
    <AppLayout>
      <PageHeader
        titulo="Orçamentos"
        subtitulo="Acompanhe tudo o que você já criou, em qualquer status."
        acao={
          <Link to="/orcamentos/novo">
            <Button className="w-full sm:w-auto">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Novo orçamento
            </Button>
          </Link>
        }
      />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filtros.map((item) => (
            <button
              key={item.valor}
              type="button"
              onClick={() => setFiltro(item.valor)}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                filtro === item.valor
                  ? "bg-brand-600 text-white"
                  : "border border-ink-200 bg-surface text-ink-600 hover:bg-ink-50"
              )}
            >
              {item.rotulo}
            </button>
          ))}
        </div>

        {!carregando && orcamentos.length > 0 && (
          <input
            type="search"
            placeholder="Buscar por cliente ou número..."
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            className="w-full min-h-10 rounded-lg border border-ink-200 bg-surface px-3 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:w-64"
          />
        )}
      </div>

      {erro && (
        <div className="mt-6">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {carregando && (
        <div className="mt-6 flex flex-col gap-3">
          {[1, 2, 3].map((chave) => (
            <Skeleton key={chave} className="h-20" />
          ))}
        </div>
      )}

      {!carregando && !erro && orcamentos.length === 0 && (
        <EmptyState
          className="mt-6"
          icone={<IconeOrcamento />}
          titulo="Você ainda não criou nenhum orçamento."
          descricao="Assim que criar o primeiro, ele aparece aqui — com status, cliente e valor sempre à mão."
          acao={
            <Link to="/orcamentos/novo">
              <Button variante="secundario">Criar meu primeiro orçamento</Button>
            </Link>
          }
        />
      )}

      {!carregando && orcamentos.length > 0 && orcamentosFiltrados.length === 0 && (
        <Card className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-ink-600">Nenhum orçamento encontrado.</p>
          <button
            type="button"
            onClick={() => {
              setBusca("");
              setFiltro("todos");
            }}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Limpar filtros
          </button>
        </Card>
      )}

      {!carregando && orcamentosFiltrados.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3 motion-safe:animate-fade-in-up">
          {orcamentosFiltrados.map((orcamento) => (
            <li key={orcamento.id}>
              <Link to={`/orcamentos/${orcamento.id}`}>
                <Card className="flex flex-col gap-3 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">
                      Orçamento #{orcamento.numero} — {orcamento.cliente.nome}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {orcamento._count.itens} {orcamento._count.itens === 1 ? "item" : "itens"} · atualizado em{" "}
                      {formatoData.format(new Date(orcamento.atualizadoEm))}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold text-ink-900">
                      {formatoMoeda.format(Number(orcamento.total))}
                    </span>
                    <StatusBadge status={orcamento.status} />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
