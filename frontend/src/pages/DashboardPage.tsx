import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { StatusBadge } from "../components/ui/StatusBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { OnboardingWizard } from "../components/onboarding/OnboardingWizard";
import { AssistenteIACard } from "../components/dashboard/AssistenteIACard";
import { useAuth } from "../context/AuthContext";
import { ApiError, devolucoesApi, estoqueApi, orcamentosApi, vendasApi } from "../lib/api";
import type { ResumoOrcamentos } from "../lib/api";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function CartaoEstatistica({
  rotulo,
  valor,
  icone,
  corIcone,
}: {
  rotulo: string;
  valor: string | number;
  icone: ReactNode;
  corIcone: string;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${corIcone}`}>
          {icone}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-ink-500">{rotulo}</p>
          <p className="mt-0.5 truncate text-2xl font-semibold text-ink-900">{valor}</p>
        </div>
      </div>
    </Card>
  );
}

function IconeOrcamentos() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
    </svg>
  );
}

interface ResumoOperacoes {
  vendasNoMes: number;
  produtosEstoqueBaixo: number;
  devolucoesEmConferencia: number;
}

export function DashboardPage() {
  const { usuario, empresa } = useAuth();
  const [resumo, setResumo] = useState<ResumoOrcamentos | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false);
  const [passoOnboarding, setPassoOnboarding] = useState(0);
  const [resumoOperacoes, setResumoOperacoes] = useState<ResumoOperacoes | null>(null);

  useEffect(() => {
    Promise.all([vendasApi.listar(), estoqueApi.listar(), devolucoesApi.listar()])
      .then(([vendas, estoque, devolucoes]) => {
        const inicioDoMes = new Date();
        inicioDoMes.setDate(1);
        inicioDoMes.setHours(0, 0, 0, 0);
        setResumoOperacoes({
          vendasNoMes: vendas.filter((v) => v.status === "CONFIRMADA" && new Date(v.criadoEm) >= inicioDoMes).length,
          produtosEstoqueBaixo: estoque.filter((i) => i.status === "BAIXO" || i.status === "SEM_ESTOQUE").length,
          devolucoesEmConferencia: devolucoes.filter((d) => d.status === "EM_CONFERENCIA" || d.status === "RECEBIDA").length,
        });
      })
      .catch(() => setResumoOperacoes(null));
  }, []);

  useEffect(() => {
    if (empresa && !empresa.onboardingConcluido && (empresa.onboardingPasso ?? 0) === 0) {
      setPassoOnboarding(0);
      setMostrarOnboarding(true);
    }
  }, [empresa]);

  function continuarConfiguracao() {
    setPassoOnboarding(Math.min((empresa?.onboardingPasso ?? 0) + 1, 6));
    setMostrarOnboarding(true);
  }

  useEffect(() => {
    orcamentosApi
      .resumo()
      .then(setResumo)
      .catch((erroCapturado) =>
        setErro(
          erroCapturado instanceof ApiError
            ? erroCapturado.message
            : "Não foi possível carregar o painel."
        )
      )
      .finally(() => setCarregando(false));
  }, []);

  const primeiroNome = usuario?.nome?.split(" ")[0];

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Olá, {primeiroNome}</h1>
          <p className="mt-1 text-sm text-ink-500">Aqui está o retrato atual dos seus orçamentos.</p>
        </div>
        <Link to="/orcamentos/novo">
          <Button className="w-full sm:w-auto">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Novo orçamento
          </Button>
        </Link>
      </div>

      {empresa && !empresa.onboardingConcluido && (empresa.onboardingPasso ?? 0) > 0 && (
        <Card className="mt-4 flex flex-col gap-3 border-brand-200 bg-brand-50 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-800">Você está configurando sua empresa</p>
            <p className="text-sm text-ink-600">{empresa.onboardingPasso} de 5 etapas concluídas</p>
          </div>
          <Button variante="secundario" className="w-full sm:w-auto" onClick={continuarConfiguracao}>
            Continuar configuração →
          </Button>
        </Card>
      )}

      {erro && (
        <div className="mt-6">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {carregando && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((chave) => (
            <Skeleton key={chave} className="h-24" />
          ))}
        </div>
      )}

      {resumo && !carregando && (
        <div className="motion-safe:animate-fade-in-up">
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CartaoEstatistica
              rotulo="Total de orçamentos"
              valor={resumo.totalOrcamentos}
              corIcone="bg-brand-100 text-brand-700"
              icone={<IconeOrcamentos />}
            />
            <CartaoEstatistica
              rotulo="Pendentes"
              valor={resumo.pendentes}
              corIcone="bg-warning-100 text-warning-700"
              icone={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <CartaoEstatistica
              rotulo="Aprovados"
              valor={resumo.aprovados}
              corIcone="bg-success-100 text-success-700"
              icone={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              }
            />
            <CartaoEstatistica
              rotulo="Valor total"
              valor={formatoMoeda.format(Number(resumo.valorTotal))}
              corIcone="bg-ink-900/10 text-ink-900"
              icone={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 7h4v4" />
                </svg>
              }
            />
          </div>

          <Card className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink-900">Orçamentos recentes</h2>
              {resumo.atividadesRecentes.length > 0 && (
                <Link to="/orcamentos" className="text-sm font-medium text-brand-600 hover:underline">
                  Ver todos
                </Link>
              )}
            </div>

            {resumo.atividadesRecentes.length === 0 ? (
              <EmptyState
                className="mt-4 border-none p-0 shadow-none"
                icone={<IconeOrcamentos />}
                titulo="Você ainda não criou nenhum orçamento."
                descricao="Vamos criar o primeiro?"
                acao={
                  <Link to="/orcamentos/novo">
                    <Button variante="secundario">Criar meu primeiro orçamento</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="mt-4 divide-y divide-ink-100">
                {resumo.atividadesRecentes.map((atividade) => (
                  <li key={atividade.id}>
                    <Link
                      to={`/orcamentos/${atividade.id}`}
                      className="flex items-center justify-between gap-4 rounded-lg px-2 py-3 -mx-2 transition-colors hover:bg-ink-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-900">
                          Orçamento #{atividade.numero} — {atividade.cliente.nome}
                        </p>
                        <p className="text-xs text-ink-500">
                          {formatoData.format(new Date(atividade.atualizadoEm))}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-medium text-ink-900">
                          {formatoMoeda.format(Number(atividade.total))}
                        </span>
                        <StatusBadge status={atividade.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {resumoOperacoes && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link to="/operacoes?aba=vendas">
            <Card className="transition-shadow hover:shadow-md">
              <p className="text-sm text-ink-500">Vendas este mês</p>
              <p className="mt-0.5 text-2xl font-semibold text-ink-900">{resumoOperacoes.vendasNoMes}</p>
            </Card>
          </Link>
          <Link to="/operacoes?aba=estoque">
            <Card className={`transition-shadow hover:shadow-md ${resumoOperacoes.produtosEstoqueBaixo > 0 ? "border-warning-600" : ""}`}>
              <p className="text-sm text-ink-500">Produtos com estoque baixo</p>
              <p className="mt-0.5 text-2xl font-semibold text-ink-900">{resumoOperacoes.produtosEstoqueBaixo}</p>
            </Card>
          </Link>
          <Link to="/operacoes?aba=devolucoes">
            <Card className={`transition-shadow hover:shadow-md ${resumoOperacoes.devolucoesEmConferencia > 0 ? "border-warning-600" : ""}`}>
              <p className="text-sm text-ink-500">Devoluções aguardando conferência</p>
              <p className="mt-0.5 text-2xl font-semibold text-ink-900">{resumoOperacoes.devolucoesEmConferencia}</p>
            </Card>
          </Link>
        </div>
      )}

      <div className="mt-6">
        <AssistenteIACard />
      </div>

      {mostrarOnboarding && (
        <OnboardingWizard passoInicial={passoOnboarding} aoFechar={() => setMostrarOnboarding(false)} />
      )}
    </AppLayout>
  );
}
