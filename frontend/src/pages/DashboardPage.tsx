import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { StatusBadge } from "../components/ui/StatusBadge";
import { OnboardingWizard } from "../components/onboarding/OnboardingWizard";
import { useAuth } from "../context/AuthContext";
import { ApiError, orcamentosApi } from "../lib/api";
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
          <p className="text-sm text-slate-500">{rotulo}</p>
          <p className="mt-0.5 truncate text-2xl font-semibold text-slate-900">{valor}</p>
        </div>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { usuario, empresa } = useAuth();
  const [resumo, setResumo] = useState<ResumoOrcamentos | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false);
  const [passoOnboarding, setPassoOnboarding] = useState(0);

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
            : "Não foi possível carregar o dashboard."
        )
      )
      .finally(() => setCarregando(false));
  }, []);

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Olá, {usuario?.nome}</h1>
          <p className="mt-1 text-sm text-slate-500">Veja como estão seus orçamentos.</p>
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
        <Card className="mt-4 flex flex-col gap-3 border-facil-200 bg-facil-50 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-orca-800">Você está configurando sua empresa</p>
            <p className="text-sm text-slate-600">
              {empresa.onboardingPasso} de 5 etapas concluídas
            </p>
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
            <Card key={chave} className="h-24 animate-pulse bg-slate-100" />
          ))}
        </div>
      )}

      {resumo && !carregando && (
        <div className="motion-safe:animate-fade-in-up">
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CartaoEstatistica
              rotulo="Total de orçamentos"
              valor={resumo.totalOrcamentos}
              corIcone="bg-facil-100 text-facil-700"
              icone={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <CartaoEstatistica
              rotulo="Pendentes"
              valor={resumo.pendentes}
              corIcone="bg-warning-100 text-warning-600"
              icone={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <CartaoEstatistica
              rotulo="Aprovados"
              valor={resumo.aprovados}
              corIcone="bg-success-100 text-success-600"
              icone={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              }
            />
            <CartaoEstatistica
              rotulo="Valor total"
              valor={formatoMoeda.format(Number(resumo.valorTotal))}
              corIcone="bg-orca-900/10 text-orca-900"
              icone={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2m9-8a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          <Card className="mt-6">
            <h2 className="text-base font-semibold text-slate-900">Atividades recentes</h2>

            {resumo.atividadesRecentes.length === 0 ? (
              <div className="mt-4 flex flex-col items-center gap-3 py-8 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
                  </svg>
                </span>
                <p className="text-sm text-slate-600">Você ainda não criou nenhum orçamento.</p>
                <p className="text-sm text-slate-500">Vamos criar o primeiro?</p>
                <Link to="/orcamentos/novo">
                  <Button variante="secundario">Criar meu primeiro orçamento</Button>
                </Link>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {resumo.atividadesRecentes.map((atividade) => (
                  <li key={atividade.id}>
                    <Link
                      to={`/orcamentos/${atividade.id}`}
                      className="flex items-center justify-between gap-4 rounded-lg px-2 py-3 -mx-2 transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          Orçamento #{atividade.numero} — {atividade.cliente.nome}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatoData.format(new Date(atividade.atualizadoEm))}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-medium text-slate-900">
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

      {mostrarOnboarding && (
        <OnboardingWizard passoInicial={passoOnboarding} aoFechar={() => setMostrarOnboarding(false)} />
      )}
    </AppLayout>
  );
}
