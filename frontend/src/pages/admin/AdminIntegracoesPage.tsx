import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Card, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { ApiError, adminApi } from "../../lib/api";
import type { StatusTecnico } from "../../lib/api";

function LinhaIntegracao({ nome, configurado, empresasConectadas }: { nome: string; configurado: boolean; empresasConectadas?: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 py-3 last:border-b-0">
      <p className="text-sm font-medium text-ink-900">{nome}</p>
      <div className="flex flex-wrap items-center gap-2">
        {empresasConectadas !== undefined && <span className="text-xs text-ink-500">{empresasConectadas} empresa(s) conectada(s)</span>}
        <Badge className={configurado ? "bg-success-100 text-success-700" : "bg-ink-100 text-ink-500"}>
          {configurado ? "Configurado" : "Não configurado"}
        </Badge>
      </div>
    </div>
  );
}

export function AdminIntegracoesPage() {
  const [status, setStatus] = useState<StatusTecnico | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    adminApi.statusTecnico().then(setStatus).catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar as integrações."));
  }, []);

  return (
    <AdminLayout>
      <PageHeader titulo="Integrações" subtitulo="Status técnico dos serviços externos conectados ao MOVA." />

      {erro && (
        <div className="mt-4">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {!status ? (
        <Skeleton className="mt-6 h-64" />
      ) : (
        <>
          <Card className="mt-6">
            <CardHeader titulo="Serviços" descricao="Só reflete se a credencial está configurada no ambiente — nunca mostra a credencial em si." />
            <div className="mt-2">
              <LinhaIntegracao nome="Mercado Pago" configurado={status.integracoes.mercadoPago.configurado} />
              <LinhaIntegracao
                nome="Mercado Livre"
                configurado={status.integracoes.mercadoLivre.configurado}
                empresasConectadas={status.integracoes.mercadoLivre.empresasConectadas}
              />
              <LinhaIntegracao
                nome="WhatsApp"
                configurado={status.integracoes.whatsapp.configurado}
                empresasConectadas={status.integracoes.whatsapp.empresasConectadas}
              />
              <LinhaIntegracao nome="Inteligência artificial" configurado={status.integracoes.ia.configurado} />
              <LinhaIntegracao nome="Transcrição de áudio" configurado={status.integracoes.transcricaoAudio.configurado} />
            </div>
          </Card>

          {status.erros.notificacoesMercadoLivreComErro > 0 && (
            <Card className="mt-4 border-danger-200 bg-danger-50">
              <p className="text-sm font-medium text-danger-800">
                {status.erros.notificacoesMercadoLivreComErro} notificação(ões) do Mercado Livre não foram processadas.
              </p>
              <p className="mt-1 text-sm text-danger-700">Veja detalhes e reprocesse em Operação → Problemas.</p>
            </Card>
          )}
        </>
      )}
    </AdminLayout>
  );
}
