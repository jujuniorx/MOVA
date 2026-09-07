import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ApiError, adminApi } from "../../lib/api";
import type { ProblemaDerivado } from "../../lib/api";

const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const ROTULOS_CATEGORIA: Record<ProblemaDerivado["categoria"], string> = { MERCADO_LIVRE: "Mercado Livre", PAGAMENTO: "Pagamento" };
const ROTULOS_SEVERIDADE: Record<ProblemaDerivado["severidade"], string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
const CLASSES_SEVERIDADE: Record<ProblemaDerivado["severidade"], string> = {
  baixa: "bg-ink-100 text-ink-600",
  media: "bg-warning-100 text-warning-700",
  alta: "bg-danger-100 text-danger-700",
};

export function AdminProblemasPage() {
  const [problemas, setProblemas] = useState<ProblemaDerivado[] | null>(null);
  const [statusDisponivel, setStatusDisponivel] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .problemas()
      .then((r) => {
        setProblemas(r.problemas);
        setStatusDisponivel(r.statusDisponivel);
      })
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar os problemas."));
  }, []);

  return (
    <AdminLayout>
      <PageHeader titulo="Problemas" subtitulo="Sinais reais detectados automaticamente — nunca inventados." />

      {!statusDisponivel && (
        <div className="mt-4">
          <Alert tipo="aviso">
            Esta é uma lista agregada em tempo real, sem fluxo de status (Novo/Investigando/Resolvido) ainda — isso depende de uma
            estrutura de acompanhamento que ainda não existe no produto.
          </Alert>
        </div>
      )}

      {erro && (
        <div className="mt-4">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {!problemas && (
        <div className="mt-6 flex flex-col gap-3">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-16" />
          ))}
        </div>
      )}

      {problemas && problemas.length === 0 && <EmptyState className="mt-6" titulo="Nenhum problema detectado no momento." />}

      {problemas && problemas.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {problemas.map((p) => (
            <li key={p.referenciaId}>
              <Card className="flex flex-col gap-1 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-900">{p.titulo}</p>
                    <Badge className="bg-ink-100 text-ink-600">{ROTULOS_CATEGORIA[p.categoria]}</Badge>
                    <Badge className={CLASSES_SEVERIDADE[p.severidade]}>{ROTULOS_SEVERIDADE[p.severidade]}</Badge>
                  </div>
                  <p className="text-xs text-ink-400">{formatoData.format(new Date(p.data))}</p>
                </div>
                <p className="text-sm text-ink-600">{p.detalhe}</p>
                {p.empresa && <p className="text-xs text-ink-500">Empresa: {p.empresa.nome}</p>}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminLayout>
  );
}
