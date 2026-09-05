import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Alert } from "../ui/Alert";
import { Skeleton } from "../ui/Skeleton";
import { ApiError, clientesApi } from "../../lib/api";
import type { Cliente, EventoHistorico } from "../../lib/api";

const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

interface ClienteHistoricoModalProps {
  cliente: Cliente | null;
  aoFechar: () => void;
}

/** Timeline do cliente: tudo que já aconteceu com ele — orçamentos, vendas, pedidos, devoluções. */
export function ClienteHistoricoModal({ cliente, aoFechar }: ClienteHistoricoModalProps) {
  const [eventos, setEventos] = useState<EventoHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!cliente) return;
    setCarregando(true);
    setErro(null);
    clientesApi
      .historico(cliente.id)
      .then(setEventos)
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar o histórico."))
      .finally(() => setCarregando(false));
  }, [cliente]);

  return (
    <Modal titulo={cliente ? `Histórico de ${cliente.nome}` : "Histórico"} aberto={cliente !== null} aoFechar={aoFechar} tamanho="grande">
      {carregando && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((chave) => (
            <Skeleton key={chave} className="h-12" />
          ))}
        </div>
      )}

      {!carregando && erro && <Alert tipo="erro">{erro}</Alert>}

      {!carregando && !erro && eventos.length === 0 && (
        <p className="text-sm text-ink-500">Nenhum evento registrado ainda para este cliente.</p>
      )}

      {!carregando && !erro && eventos.length > 0 && (
        <ol className="flex flex-col gap-4">
          {eventos.map((evento) => (
            <li key={evento.id} className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm text-ink-900">{evento.descricao}</p>
                <p className="mt-0.5 text-xs text-ink-400">{formatoData.format(new Date(evento.criadoEm))}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
