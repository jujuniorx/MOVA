import { useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { Textarea } from "../ui/Textarea";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { ApiError, iaApi, produtosApi } from "../../lib/api";
import type { EstimativaPreco, Produto } from "../../lib/api";

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
  /** Catálogo já cadastrado — permite aplicar a sugestão a um produto existente. */
  produtos: Produto[];
  /** Chamado depois de aplicar o preço com sucesso, pra recarregar a lista. */
  aoAplicarPreco: () => void;
}

/**
 * "Quanto devo cobrar?" a partir de uma foto — VÊ → ENTENDE → SUGERE →
 * CONFIRMA. A IA nunca escreve no catálogo sozinha: a pessoa escolhe o
 * produto, pode ajustar o valor sugerido, e só aplica com uma confirmação
 * explícita (mesmo padrão de "interpretar → mostrar → confirmar" usado no
 * Perfil Operacional).
 */
export function EstimarPrecoImagemModal({ aberto, aoFechar, produtos, aoAplicarPreco }: EstimarPrecoImagemModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<EstimativaPreco | null>(null);
  const [produtoEscolhidoId, setProdutoEscolhidoId] = useState("");
  const [precoParaAplicar, setPrecoParaAplicar] = useState("");
  const [aplicando, setAplicando] = useState(false);
  const [aplicado, setAplicado] = useState(false);

  function fechar() {
    setArquivo(null);
    setPreviewUrl(null);
    setDescricao("");
    setErro(null);
    setResultado(null);
    setProdutoEscolhidoId("");
    setPrecoParaAplicar("");
    setAplicado(false);
    aoFechar();
  }

  async function aplicarPreco() {
    if (!produtoEscolhidoId || !precoParaAplicar) return;
    setErro(null);
    setAplicando(true);
    try {
      await produtosApi.atualizar(produtoEscolhidoId, { preco: Number(precoParaAplicar) });
      setAplicado(true);
      aoAplicarPreco();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível aplicar o preço agora.");
    } finally {
      setAplicando(false);
    }
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
      if (r.dados.precoRecomendado !== null) setPrecoParaAplicar(String(r.dados.precoRecomendado));
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

            {aplicado ? (
              <Alert tipo="sucesso">Preço aplicado ao produto. Você pode ajustar de novo a qualquer momento em Produtos.</Alert>
            ) : (
              <div className="rounded-lg border border-ink-200 p-4">
                <p className="text-sm font-medium text-ink-900">Quer aplicar esse valor a um produto já cadastrado?</p>
                <p className="mt-1 text-xs text-ink-500">
                  Esta é só uma estimativa — nada muda no catálogo até você escolher o produto, revisar o valor e confirmar.
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Select
                      rotulo="Produto"
                      value={produtoEscolhidoId}
                      onChange={(e) => setProdutoEscolhidoId(e.target.value)}
                    >
                      <option value="">Selecione um produto...</option>
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} (atual: {formatoMoeda.format(Number(p.preco))})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-32">
                    <Input
                      rotulo="Preço (R$)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={precoParaAplicar}
                      onChange={(e) => setPrecoParaAplicar(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={aplicarPreco}
                    carregando={aplicando}
                    disabled={!produtoEscolhidoId || !precoParaAplicar || Number(precoParaAplicar) <= 0}
                  >
                    Confirmar e aplicar
                  </Button>
                </div>
              </div>
            )}

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
