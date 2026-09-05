import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { ApiError, iaApi } from "../../lib/api";
import { montarLinkWhatsappTexto } from "../../lib/whatsapp";

interface SugerirFollowupModalProps {
  aberto: boolean;
  aoFechar: () => void;
  orcamentoId: string;
  numeroOrcamento: number;
  whatsappCliente?: string | null;
  telefoneCliente?: string | null;
}

/**
 * A IA só rascunha — o envio de verdade é sempre uma ação manual do usuário
 * (abre o WhatsApp com o texto já revisado/editado). Nenhum envio automático
 * acontece aqui.
 */
export function SugerirFollowupModal({ aberto, aoFechar, orcamentoId, numeroOrcamento, whatsappCliente, telefoneCliente }: SugerirFollowupModalProps) {
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    setMensagem("");
    setCarregando(true);
    iaApi
      .sugerirFollowup(orcamentoId)
      .then((r) => setMensagem(r.resposta))
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível gerar uma sugestão agora."))
      .finally(() => setCarregando(false));
  }, [aberto, orcamentoId]);

  const linkWhatsapp = montarLinkWhatsappTexto(whatsappCliente || telefoneCliente, mensagem);

  return (
    <Modal titulo={`Sugerir follow-up — Orçamento #${numeroOrcamento}`} aberto={aberto} aoFechar={aoFechar} tamanho="grande">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-500">
          A IA sugeriu esta mensagem com base no orçamento parado. Revise e edite antes de enviar — nada é enviado automaticamente.
        </p>

        {erro && <Alert tipo="erro">{erro}</Alert>}

        {carregando ? (
          <div className="flex min-h-32 items-center justify-center text-sm text-ink-500">Gerando sugestão...</div>
        ) : (
          !erro && (
            <>
              <Textarea rotulo="Mensagem (edite como quiser)" value={mensagem} onChange={(e) => setMensagem(e.target.value)} className="min-h-40" />
              <div className="flex justify-end gap-3">
                <Button type="button" variante="secundario" onClick={aoFechar}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variante="whatsapp"
                  disabled={!mensagem.trim()}
                  onClick={() => window.open(linkWhatsapp, "_blank", "noopener,noreferrer")}
                >
                  Abrir no WhatsApp para enviar
                </Button>
              </div>
            </>
          )
        )}
      </div>
    </Modal>
  );
}
