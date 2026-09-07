import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Card } from "../../components/ui/Card";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ApiError, adminApi } from "../../lib/api";
import type { AssinaturaAdmin } from "../../lib/api";

const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const CLASSES_STATUS: Record<string, string> = {
  ATIVA: "bg-success-100 text-success-700",
  PENDENTE: "bg-warning-100 text-warning-700",
  PAUSADA: "bg-warning-100 text-warning-700",
  RECUSADA: "bg-danger-100 text-danger-700",
  CANCELADA: "bg-ink-100 text-ink-600",
  EXPIRADA: "bg-ink-100 text-ink-600",
};

export function AdminAssinaturasPage() {
  const [status, setStatus] = useState("");
  const [assinaturas, setAssinaturas] = useState<AssinaturaAdmin[] | null>(null);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  function carregar(s: string) {
    setAssinaturas(null);
    adminApi
      .listarAssinaturas(s || undefined)
      .then((r) => {
        setAssinaturas(r.assinaturas);
        setTotal(r.total);
      })
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar as assinaturas."));
  }

  useEffect(() => carregar(""), []);

  return (
    <AdminLayout>
      <PageHeader titulo="Assinaturas" subtitulo={`Cobrança recorrente via Mercado Pago (${total}).`} />

      <Card className="mt-6">
        <Select
          rotulo="Filtrar por status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            carregar(e.target.value);
          }}
          className="sm:w-64"
        >
          <option value="">Todos</option>
          <option value="ATIVA">Ativa</option>
          <option value="PENDENTE">Pendente</option>
          <option value="PAUSADA">Pausada</option>
          <option value="RECUSADA">Recusada</option>
          <option value="CANCELADA">Cancelada</option>
          <option value="EXPIRADA">Expirada</option>
        </Select>
      </Card>

      {erro && (
        <div className="mt-4">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {!assinaturas && (
        <div className="mt-6 flex flex-col gap-3">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-16" />
          ))}
        </div>
      )}

      {assinaturas && assinaturas.length === 0 && (
        <EmptyState className="mt-6" titulo="Nenhuma assinatura encontrada." descricao="O MOVA ainda não tem cobrança recorrente ativa configurada, ou nenhuma empresa assinou um plano pago ainda." />
      )}

      {assinaturas && assinaturas.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {assinaturas.map((a) => (
            <li key={a.id}>
              <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-900">{a.empresa.nome}</p>
                    <Badge className={CLASSES_STATUS[a.status] ?? "bg-ink-100 text-ink-600"}>{a.status}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {a.planoTipo} · {a.cicloFaturamento}
                    {a.proximaCobranca ? ` · próxima cobrança ${formatoData.format(new Date(a.proximaCobranca))}` : ""}
                    {a.canceladaEm ? ` · cancelada em ${formatoData.format(new Date(a.canceladaEm))}` : ""}
                  </p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminLayout>
  );
}
