import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Card, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { Skeleton } from "../../components/ui/Skeleton";
import { PageHeader } from "../../components/ui/PageHeader";
import { ApiError, adminApi } from "../../lib/api";
import type { MetricasAdmin, ProblemaDerivado, SaudeSistema } from "../../lib/api";

const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const ROTULOS_SEVERIDADE: Record<ProblemaDerivado["severidade"], string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
const CLASSES_SEVERIDADE: Record<ProblemaDerivado["severidade"], string> = {
  baixa: "bg-ink-100 text-ink-600",
  media: "bg-warning-100 text-warning-700",
  alta: "bg-danger-100 text-danger-700",
};
const CLASSES_STATUS: Record<SaudeSistema["geral"], string> = {
  operacional: "bg-success-100 text-success-700",
  atencao: "bg-warning-100 text-warning-700",
  indisponivel: "bg-danger-100 text-danger-700",
};
const ROTULOS_STATUS: Record<SaudeSistema["geral"], string> = {
  operacional: "Operacional",
  atencao: "Atenção",
  indisponivel: "Indisponível",
};

function Metrica({ rotulo, valor, destaque }: { rotulo: string; valor: string | number; destaque?: boolean }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{rotulo}</p>
      <p className={`mt-0.5 text-xl font-semibold ${destaque ? "text-danger-600" : "text-ink-900"}`}>{valor}</p>
    </div>
  );
}

export function AdminInicioPage() {
  const [metricas, setMetricas] = useState<MetricasAdmin | null>(null);
  const [saude, setSaude] = useState<SaudeSistema | null>(null);
  const [problemas, setProblemas] = useState<ProblemaDerivado[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    adminApi.metricas().then(setMetricas).catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar as métricas."));
    adminApi.saude().then(setSaude).catch(() => setSaude(null));
    adminApi.problemas().then((r) => setProblemas(r.problemas)).catch(() => setProblemas([]));
  }, []);

  return (
    <AdminLayout>
      <PageHeader titulo="Início" subtitulo="Visão geral da plataforma MOVA." />

      {erro && (
        <div className="mt-4">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {!metricas ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((k) => (
            <Skeleton key={k} className="h-20" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <Metrica rotulo="Empresas" valor={metricas.empresas.total} />
            </Card>
            <Card>
              <Metrica rotulo="Ativas" valor={metricas.empresas.ativas} />
            </Card>
            <Card>
              <Metrica rotulo="Suspensas" valor={metricas.empresas.suspensas} destaque={metricas.empresas.suspensas > 0} />
            </Card>
            <Card>
              <Metrica rotulo="Novas (30 dias)" valor={metricas.empresas.novas30d} />
            </Card>
            <Card>
              <Metrica rotulo="Usuários" valor={metricas.usuarios.total} />
            </Card>
            <Card>
              <Metrica rotulo="Assinaturas ativas" valor={metricas.assinaturas.ativas} />
            </Card>
            <Card>
              <Metrica rotulo="Assinaturas com problema" valor={metricas.assinaturas.comProblema} destaque={metricas.assinaturas.comProblema > 0} />
            </Card>
            <Card>
              <Metrica rotulo="Chamadas de IA (30 dias)" valor={metricas.ia.chamadas30d} />
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader titulo="Empresas por plano" />
            <div className="mt-3 flex flex-wrap gap-2">
              {metricas.empresasPorPlano.map((p) => (
                <Badge key={p.plano} className="bg-ink-100 text-ink-700">
                  {p.plano}: {p.total}
                </Badge>
              ))}
            </div>
          </Card>
        </>
      )}

      <Card className="mt-6">
        <CardHeader titulo="Precisa da minha atenção" descricao="Só aparece aqui o que realmente precisa de ação — sem alarme falso." />
        {problemas === null ? (
          <Skeleton className="mt-3 h-16" />
        ) : problemas.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">Nada precisa da sua atenção agora.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {problemas.slice(0, 8).map((p) => (
              <li key={p.referenciaId} className="flex items-start justify-between gap-3 rounded-lg bg-ink-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900">{p.titulo}</p>
                  <p className="truncate text-xs text-ink-500">
                    {p.detalhe} · {formatoData.format(new Date(p.data))}
                  </p>
                </div>
                <Badge className={CLASSES_SEVERIDADE[p.severidade]}>{ROTULOS_SEVERIDADE[p.severidade]}</Badge>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Link to="/admin/problemas" className="text-sm font-medium text-brand-600 hover:underline">
            Ver todos os problemas
          </Link>
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader titulo="Saúde do sistema" />
        {!saude ? (
          <Skeleton className="mt-3 h-10" />
        ) : (
          <>
            <div className="mt-3 flex items-center gap-2">
              <Badge className={CLASSES_STATUS[saude.geral]}>{ROTULOS_STATUS[saude.geral]}</Badge>
              <span className="text-xs text-ink-400">Verificado às {formatoData.format(new Date(saude.verificadoEm))}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(saude.servicos).map(([nome, info]) => (
                <Badge key={nome} className={CLASSES_STATUS[info.status]}>
                  {nome}: {ROTULOS_STATUS[info.status]}
                </Badge>
              ))}
            </div>
            <div className="mt-3">
              <Link to="/admin/saude" className="text-sm font-medium text-brand-600 hover:underline">
                Ver detalhes
              </Link>
            </div>
          </>
        )}
      </Card>
    </AdminLayout>
  );
}
