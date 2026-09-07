import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Card, CardHeader } from "../../components/ui/Card";
import { Alert } from "../../components/ui/Alert";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { ApiError, adminApi } from "../../lib/api";
import type { MetricasAdmin } from "../../lib/api";

function BarraFunil({ rotulo, valor, total }: { rotulo: string; valor: number; total: number }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-700">{rotulo}</span>
        <span className="font-medium text-ink-900">
          {valor} <span className="text-ink-400">({pct}%)</span>
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ink-100">
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AdminMetricasPage() {
  const [metricas, setMetricas] = useState<MetricasAdmin | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    adminApi.metricas().then(setMetricas).catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar as métricas."));
  }, []);

  return (
    <AdminLayout>
      <PageHeader titulo="Métricas" subtitulo="Números reais de produto — nada estimado." />

      {erro && (
        <div className="mt-4">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {!metricas ? (
        <Skeleton className="mt-6 h-64" />
      ) : (
        <>
          <Card className="mt-6">
            <CardHeader
              titulo="Funil de ativação"
              descricao="Quantas empresas, do total cadastrado, já passaram por cada marco — ajuda a ver onde o empreendedor trava."
            />
            <div className="mt-4 flex flex-col gap-4">
              <BarraFunil rotulo="Cadastrou a empresa" valor={metricas.funilAtivacao.totalEmpresas} total={metricas.funilAtivacao.totalEmpresas} />
              <BarraFunil rotulo="Concluiu a configuração inicial" valor={metricas.funilAtivacao.configurouEmpresa} total={metricas.funilAtivacao.totalEmpresas} />
              <BarraFunil rotulo="Cadastrou um produto/serviço" valor={metricas.funilAtivacao.cadastrouProduto} total={metricas.funilAtivacao.totalEmpresas} />
              <BarraFunil rotulo="Cadastrou um cliente" valor={metricas.funilAtivacao.cadastrouCliente} total={metricas.funilAtivacao.totalEmpresas} />
              <BarraFunil rotulo="Fez o primeiro orçamento" valor={metricas.funilAtivacao.fezOrcamento} total={metricas.funilAtivacao.totalEmpresas} />
              <BarraFunil rotulo="Fez a primeira venda" valor={metricas.funilAtivacao.fezVenda} total={metricas.funilAtivacao.totalEmpresas} />
            </div>
          </Card>

          <Card className="mt-6">
            <CardHeader titulo="Empresas por plano" />
            <ul className="mt-3 flex flex-col gap-2">
              {metricas.empresasPorPlano.map((p) => (
                <li key={p.plano} className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{p.plano}</span>
                  <span className="font-medium text-ink-900">{p.total}</span>
                </li>
              ))}
            </ul>
          </Card>

          <p className="mt-4 text-xs text-ink-400">
            Retenção e receita ainda não estão disponíveis — dependem da cobrança recorrente real, que ainda está em preparação.
          </p>
        </>
      )}
    </AdminLayout>
  );
}
