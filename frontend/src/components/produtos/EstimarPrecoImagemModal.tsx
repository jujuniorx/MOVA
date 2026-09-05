import { useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { ApiError, iaApi } from "../../lib/api";
import type { EstimativaPreco } from "../../lib/api";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const CONFIANCA_ROTULO: Record<EstimativaPreco["confianca"], { texto: string; cor: string }> = {
  alta: { texto: "Confiança alta", cor: "text-success-700" },
  media: { texto: "Confiança média", cor: "text-warning-700" },
  baixa: { texto: "Confiança baixa", cor: "text-danger-700" },
};

interface EstimarPrecoImagemModalProps {
  aberto: boolean;
  aoFechar: () => void;
}

/**
 * "Quanto devo cobrar?" a partir de uma foto — só sugere, nunca altera preço
 * de catálogo sozinha. O empresário decide se usa o valor sugerido.
 */
export function EstimarPrecoImagemModal({ aberto, aoFechar }: EstimarPrecoImagemModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<EstimativaPreco | null>(null);

  function fechar() {
    setArquivo(null);
    setPreviewUrl(null);
    setDescricao("");
    setErro(null);
    setResultado(null);
    aoFechar();
  }

  function aoSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivo(file);
    setResultado(null);
    setErro(null);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function estimar() {
    if (!arquivo) return;
    setErro(null);
    setEnviando(true);
    try {
      const imagemBase64 = await blobParaBase64(arquivo);
      const r = await iaApi.estimarPrecoImagem(imagemBase64, arquivo.type, descricao || undefined);
      setResultado(r.dados);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível analisar a imagem agora.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Quanto devo cobrar? (por foto)" aberto={aberto} aoFechar={fechar} tamanho="grande">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-500">
          Envie uma foto do produto ou serviço. A IA analisa o que aparece na imagem e sugere uma faixa de preço — é sempre uma estimativa para você revisar, nunca um valor definitivo.
        </p>

        {erro && <Alert tipo="erro">{erro}</Alert>}

        {!resultado && (
          <>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={aoSelecionarArquivo} />
            {previewUrl ? (
              <div className="flex flex-col items-center gap-2">
                <img src={previewUrl} alt="Pré-visualização" className="max-h-64 rounded-lg border border-ink-200 object-contain" />
                <button type="button" onClick={() => inputRef.current?.click()} className="text-sm font-medium text-brand-600 hover:underline">
                  Trocar imagem
                </button>
              </div>
            ) : (
              <Button type="button" variante="secundario" onClick={() => inputRef.current?.click()}>
                Selecionar foto
              </Button>
            )}

            <Textarea
              rotulo="Contexto (opcional)"
              placeholder="Ex.: é um portão de ferro, cliente quer com pintura eletrostática."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variante="secundario" onClick={fechar}>
                Cancelar
              </Button>
              <Button type="button" onClick={estimar} carregando={enviando} disabled={!arquivo}>
                Analisar imagem
              </Button>
            </div>
          </>
        )}

        {resultado && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-ink-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">O que a IA observou na imagem</p>
              <p className="mt-1 text-sm text-ink-800">{resultado.observado}</p>
            </div>

            {resultado.informadoPeloUsuario && (
              <div className="rounded-lg border border-ink-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">O que você informou</p>
                <p className="mt-1 text-sm text-ink-800">{resultado.informadoPeloUsuario}</p>
              </div>
            )}

            <div className="rounded-lg bg-brand-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Faixa sugerida</p>
              <p className="mt-1 text-lg font-semibold text-brand-900">
                {resultado.faixaMinima !== null && resultado.faixaMaxima !== null
                  ? `${formatoMoeda.format(resultado.faixaMinima)} — ${formatoMoeda.format(resultado.faixaMaxima)}`
                  : "Não foi possível estimar uma faixa com segurança"}
              </p>
              {resultado.precoRecomendado !== null && (
                <p className="mt-1 text-sm text-brand-800">Preço recomendado: {formatoMoeda.format(resultado.precoRecomendado)}</p>
              )}
              <p className={`mt-2 text-sm font-medium ${CONFIANCA_ROTULO[resultado.confianca].cor}`}>{CONFIANCA_ROTULO[resultado.confianca].texto}</p>
            </div>

            <div className="rounded-lg border border-ink-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Como a IA chegou nesse número</p>
              <p className="mt-1 text-sm text-ink-800">{resultado.justificativa}</p>
            </div>

            <p className="text-xs text-ink-400">
              Esta é uma estimativa — nenhum preço de catálogo foi alterado. Se quiser usar esse valor, cadastre-o manualmente no produto.
            </p>

            <div className="flex justify-end">
              <Button type="button" variante="secundario" onClick={fechar}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
