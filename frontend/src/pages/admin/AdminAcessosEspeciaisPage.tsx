import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ApiError, adminApi } from "../../lib/api";
import type { AcessoEspecialAdmin, DuracaoAcessoEspecial } from "../../lib/api";

const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const ROTULOS_DURACAO: Record<DuracaoAcessoEspecial, string> = {
  DIAS_15: "15 dias",
  DIAS_30: "30 dias",
  DIAS_90: "90 dias",
  ANO_1: "1 ano",
  VITALICIO: "Vitalício",
};

export function AdminAcessosEspeciaisPage() {
  const [apenasAtivos, setApenasAtivos] = useState(true);
  const [acessos, setAcessos] = useState<AcessoEspecialAdmin[] | null>(null);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  function carregar(ativos: boolean) {
    setAcessos(null);
    adminApi
      .listarAcessosEspeciais(ativos)
      .then((r) => {
        setAcessos(r.acessos);
        setTotal(r.total);
      })
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar os acessos especiais."));
  }

  useEffect(() => carregar(true), []);

  return (
    <AdminLayout>
      <PageHeader
        titulo="Acessos especiais"
        subtitulo={`Cortesias e liberações administrativas — sempre separadas do plano comercial (${total}).`}
      />

      <div className="mt-4 flex gap-2">
        <Button
          tamanho="sm"
          variante={apenasAtivos ? "primario" : "secundario"}
          onClick={() => {
            setApenasAtivos(true);
            carregar(true);
          }}
        >
          Ativos
        </Button>
        <Button
          tamanho="sm"
          variante={!apenasAtivos ? "primario" : "secundario"}
          onClick={() => {
            setApenasAtivos(false);
            carregar(false);
          }}
        >
          Todos (incluindo revogados)
        </Button>
      </div>

      {erro && (
        <div className="mt-4">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {!acessos && (
        <div className="mt-6 flex flex-col gap-3">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-16" />
          ))}
        </div>
      )}

      {acessos && acessos.length === 0 && <EmptyState className="mt-6" titulo="Nenhum acesso especial encontrado." />}

      {acessos && acessos.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {acessos.map((a) => (
            <li key={a.id}>
              <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-900">{a.empresa.nome}</p>
                    <Badge className={a.ativo ? "bg-success-100 text-success-700" : "bg-ink-100 text-ink-600"}>
                      {a.ativo ? "Ativo" : "Revogado"}
                    </Badge>
                    <Badge className="bg-brand-50 text-brand-700">{a.planoTipo}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {ROTULOS_DURACAO[a.duracao]} · concedido por {a.concedidoPorAdmin.nome} em {formatoData.format(new Date(a.concedidoEm))}
                    {a.expiraEm ? ` · expira em ${formatoData.format(new Date(a.expiraEm))}` : ""}
                    {a.motivo ? ` · ${a.motivo}` : ""}
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
