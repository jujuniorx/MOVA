import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { ApiError, adminApi } from "../../lib/api";
import type { SaudeSistema } from "../../lib/api";

const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const CLASSES: Record<SaudeSistema["geral"], string> = {
  operacional: "bg-success-100 text-success-700",
  atencao: "bg-warning-100 text-warning-700",
  indisponivel: "bg-danger-100 text-danger-700",
};
const ROTULOS: Record<SaudeSistema["geral"], string> = { operacional: "Operacional", atencao: "Atenção", indisponivel: "Indisponível" };
const NOMES: Record<string, string> = {
  banco: "Banco de dados",
  ia: "Inteligência artificial",
  transcricaoAudio: "Transcrição de áudio",
  email: "E-mail (Resend)",
  mercadoPago: "Mercado Pago",
  mercadoLivre: "Mercado Livre",
  whatsapp: "WhatsApp",
  jobs: "Filas e jobs",
};

export function AdminSaudePage() {
  const [saude, setSaude] = useState<SaudeSistema | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);

  function carregar() {
    setVerificando(true);
    adminApi
      .saude()
      .then(setSaude)
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível verificar a saúde do sistema."))
      .finally(() => setVerificando(false));
  }

  useEffect(carregar, []);

  return (
    <AdminLayout>
      <PageHeader
        titulo="Saúde do sistema"
        subtitulo="Verificações leves — nunca chamadas reais e caras aos provedores externos."
        acao={
          <Button variante="secundario" onClick={carregar} carregando={verificando}>
            Verificar agora
          </Button>
        }
      />

      {erro && (
        <div className="mt-4">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {!saude ? (
        <Skeleton className="mt-6 h-64" />
      ) : (
        <>
          <Card className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm text-ink-500">Status geral</p>
              <Badge className={`mt-1 ${CLASSES[saude.geral]}`}>{ROTULOS[saude.geral]}</Badge>
            </div>
            <p className="text-xs text-ink-400">Verificado às {formatoData.format(new Date(saude.verificadoEm))}</p>
          </Card>

          <ul className="mt-4 flex flex-col gap-2">
            {Object.entries(saude.servicos).map(([chave, info]) => (
              <li key={chave}>
                <Card className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900">{NOMES[chave] ?? chave}</p>
                    {info.detalhe && <p className="text-xs text-ink-500">{info.detalhe}</p>}
                    {info.latenciaMs != null && <p className="text-xs text-ink-400">{info.latenciaMs}ms</p>}
                  </div>
                  <Badge className={CLASSES[info.status]}>{ROTULOS[info.status]}</Badge>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </AdminLayout>
  );
}
