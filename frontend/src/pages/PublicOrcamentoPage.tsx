import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert } from "../components/ui/Alert";
import { Skeleton } from "../components/ui/Skeleton";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { Textarea } from "../components/ui/Textarea";
import { DocumentoOrcamento } from "../components/orcamentos/DocumentoOrcamento";
import { Logo } from "../components/Logo";
import { ApiError, orcamentosApi, resolverUrlArquivo } from "../lib/api";
import type { OrcamentoPublico } from "../lib/api";

export function PublicOrcamentoPage() {
  const { id } = useParams<{ id: string }>();
  const [orcamento, setOrcamento] = useState<OrcamentoPublico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviandoResposta, setEnviandoResposta] = useState<"aprovar" | "recusar" | null>(null);
  const [erroResposta, setErroResposta] = useState<string | null>(null);
  const [modalRecusaAberto, setModalRecusaAberto] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState("");

  function carregar() {
    if (!id) return;
    setCarregando(true);
    orcamentosApi
      .obterPublico(id)
      .then(setOrcamento)
      .catch((erroCapturado) =>
        setErro(
          erroCapturado instanceof ApiError
            ? erroCapturado.message
            : "Não foi possível carregar o orçamento."
        )
      )
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, [id]);

  async function aprovar() {
    if (!id) return;
    setErroResposta(null);
    setEnviandoResposta("aprovar");
    try {
      await orcamentosApi.aprovarPublico(id);
      carregar();
    } catch (erroCapturado) {
      setErroResposta(erroCapturado instanceof ApiError ? erroCapturado.message : "Não foi possível registrar sua aprovação agora.");
    } finally {
      setEnviandoResposta(null);
    }
  }

  async function confirmarRecusa() {
    if (!id) return;
    setErroResposta(null);
    setEnviandoResposta("recusar");
    try {
      await orcamentosApi.recusarPublico(id, motivoRecusa.trim() || undefined);
      setModalRecusaAberto(false);
      carregar();
    } catch (erroCapturado) {
      setErroResposta(erroCapturado instanceof ApiError ? erroCapturado.message : "Não foi possível registrar sua resposta agora.");
    } finally {
      setEnviandoResposta(null);
    }
  }

  return (
    <div className="tema-claro-forcado min-h-svh bg-ink-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        {carregando && <Skeleton className="h-64" />}

        {!carregando && (erro || !orcamento) && <Alert tipo="erro">{erro ?? "Orçamento não encontrado."}</Alert>}

        {!carregando && orcamento && (
          <>
            <DocumentoOrcamento
              nomeEmpresa={orcamento.empresa.nome}
              logoUrl={resolverUrlArquivo(orcamento.empresa.logoUrl)}
              corPrimaria={orcamento.empresa.corPrimaria}
              numero={orcamento.numero}
              data={orcamento.data}
              validade={orcamento.validade}
              nomeCliente={orcamento.cliente.nome}
              itens={orcamento.itens}
              subtotal={orcamento.subtotal}
              desconto={orcamento.desconto}
              total={orcamento.total}
              observacoes={orcamento.observacoes}
              statusBadge={<StatusBadge status={orcamento.status} />}
            />

            {orcamento.status === "ENVIADO" && (
              <Card className="mt-4">
                {erroResposta && (
                  <div className="mb-4">
                    <Alert tipo="erro">{erroResposta}</Alert>
                  </div>
                )}
                <p className="text-sm font-medium text-ink-900">O que você decide sobre este orçamento?</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <Button onClick={aprovar} carregando={enviandoResposta === "aprovar"} disabled={enviandoResposta !== null} className="flex-1">
                    Aprovar orçamento
                  </Button>
                  <Button
                    variante="secundario"
                    onClick={() => setModalRecusaAberto(true)}
                    disabled={enviandoResposta !== null}
                    className="flex-1"
                  >
                    Recusar
                  </Button>
                </div>
              </Card>
            )}

            {orcamento.status === "APROVADO" && (
              <Card className="mt-4 border-success-200 bg-success-50">
                <p className="text-sm font-medium text-success-800">Você aprovou este orçamento.</p>
              </Card>
            )}

            {orcamento.status === "RECUSADO" && (
              <Card className="mt-4">
                <p className="text-sm font-medium text-ink-700">Você recusou este orçamento.</p>
              </Card>
            )}
          </>
        )}

        <p className="mt-6 text-center text-xs text-ink-400">Gerado com MOVA</p>
      </div>

      <Modal titulo="Recusar orçamento" aberto={modalRecusaAberto} aoFechar={() => setModalRecusaAberto(false)}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-600">Se quiser, conte para a empresa o motivo (opcional).</p>
          <Textarea
            rotulo="Motivo (opcional)"
            value={motivoRecusa}
            onChange={(e) => setMotivoRecusa(e.target.value)}
            placeholder="Ex: preço acima do esperado, escolhi outra empresa..."
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variante="secundario" onClick={() => setModalRecusaAberto(false)} disabled={enviandoResposta !== null}>
              Cancelar
            </Button>
            <Button type="button" variante="perigo" onClick={confirmarRecusa} carregando={enviandoResposta === "recusar"}>
              Confirmar recusa
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
