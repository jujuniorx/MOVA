import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Card } from "../../components/ui/Card";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { ApiError, adminApi } from "../../lib/api";
import type { LogAuditoriaAdmin } from "../../lib/api";

const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const TAKE = 50;

export function AdminAuditoriaPage() {
  const [logs, setLogs] = useState<LogAuditoriaAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  function carregar(novoSkip: number) {
    setCarregando(true);
    adminApi
      .auditoriaGlobal({ skip: novoSkip, take: TAKE })
      .then((r) => {
        setLogs(r.logs);
        setTotal(r.total);
        setSkip(novoSkip);
      })
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar a auditoria."))
      .finally(() => setCarregando(false));
  }

  useEffect(() => carregar(0), []);

  return (
    <AdminLayout>
      <PageHeader titulo="Auditoria" subtitulo="Histórico de todas as ações administrativas na plataforma." />

      {erro && (
        <div className="mt-4">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {carregando && (
        <div className="mt-6 flex flex-col gap-3">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-16" />
          ))}
        </div>
      )}

      {!carregando && logs.length === 0 && <EmptyState className="mt-6" titulo="Nenhuma ação administrativa registrada ainda." />}

      {!carregando && logs.length > 0 && (
        <>
          <ul className="mt-6 flex flex-col gap-2">
            {logs.map((log) => (
              <li key={log.id}>
                <Card className="flex flex-col gap-1 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink-900">{log.acao}</p>
                    <p className="text-xs text-ink-400">{formatoData.format(new Date(log.criadoEm))}</p>
                  </div>
                  <p className="text-xs text-ink-500">
                    Por {log.admin.nome} ({log.admin.email}){log.empresa ? ` · Empresa: ${log.empresa.nome}` : ""}
                  </p>
                  {log.motivo && <p className="text-sm text-ink-600">Motivo: {log.motivo}</p>}
                </Card>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-ink-400">
              {skip + 1}–{Math.min(skip + TAKE, total)} de {total}
            </p>
            <div className="flex gap-2">
              <Button variante="secundario" tamanho="sm" disabled={skip === 0} onClick={() => carregar(Math.max(skip - TAKE, 0))}>
                Anterior
              </Button>
              <Button variante="secundario" tamanho="sm" disabled={skip + TAKE >= total} onClick={() => carregar(skip + TAKE)}>
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
