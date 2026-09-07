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
import type { LogAuditoriaAdmin } from "../../lib/api";

const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const ROTULOS_TIPO: Record<string, string> = {
  ADMIN_LOGIN: "Login administrativo",
  ADMIN_LOGIN_FALHOU: "Tentativa de login administrativo falhou",
  ADMIN_LOGOUT: "Logout administrativo",
  EMPRESA_SUSPENSA: "Empresa suspensa",
  USUARIO_DESATIVADO: "Usuário desativado",
};

const CLASSES_TIPO: Record<string, string> = {
  ADMIN_LOGIN_FALHOU: "bg-danger-100 text-danger-700",
  EMPRESA_SUSPENSA: "bg-warning-100 text-warning-700",
  USUARIO_DESATIVADO: "bg-warning-100 text-warning-700",
};

export function AdminSegurancaPage() {
  const [dias, setDias] = useState(30);
  const [tipo, setTipo] = useState("");
  const [eventos, setEventos] = useState<LogAuditoriaAdmin[] | null>(null);
  const [tiposConhecidos, setTiposConhecidos] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  function carregar(d: number, t: string) {
    setEventos(null);
    adminApi
      .seguranca(d, t || undefined)
      .then((r) => {
        setEventos(r.eventos);
        setTiposConhecidos(r.tiposConhecidos);
      })
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar os eventos de segurança."));
  }

  useEffect(() => carregar(30, ""), []);

  return (
    <AdminLayout>
      <PageHeader titulo="Segurança" subtitulo="Eventos administrativos sensíveis — login, logout, tentativas falhas e ações críticas." />

      <Card className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Select
          rotulo="Período"
          value={dias}
          onChange={(e) => {
            const d = Number(e.target.value);
            setDias(d);
            carregar(d, tipo);
          }}
          className="sm:w-48"
        >
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </Select>
        <Select
          rotulo="Tipo de evento"
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value);
            carregar(dias, e.target.value);
          }}
          className="sm:w-64"
        >
          <option value="">Todos os tipos de segurança</option>
          {tiposConhecidos.map((t) => (
            <option key={t} value={t}>
              {ROTULOS_TIPO[t] ?? t}
            </option>
          ))}
        </Select>
      </Card>

      {erro && (
        <div className="mt-4">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {!eventos && (
        <div className="mt-6 flex flex-col gap-3">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-16" />
          ))}
        </div>
      )}

      {eventos && eventos.length === 0 && <EmptyState className="mt-6" titulo="Nenhum evento de segurança neste período." />}

      {eventos && eventos.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {eventos.map((e) => (
            <li key={e.id}>
              <Card className="flex flex-col gap-1 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-900">{ROTULOS_TIPO[e.acao] ?? e.acao}</p>
                    {CLASSES_TIPO[e.acao] && <Badge className={CLASSES_TIPO[e.acao]}>Atenção</Badge>}
                  </div>
                  <p className="text-xs text-ink-400">{formatoData.format(new Date(e.criadoEm))}</p>
                </div>
                <p className="text-xs text-ink-500">
                  {e.admin.nome} ({e.admin.email}){e.empresa ? ` · Empresa: ${e.empresa.nome}` : ""}
                </p>
                {e.motivo && <p className="text-sm text-ink-600">{e.motivo}</p>}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminLayout>
  );
}
