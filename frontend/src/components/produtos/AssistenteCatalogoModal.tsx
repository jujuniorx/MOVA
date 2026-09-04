import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Alert } from "../ui/Alert";
import { cn } from "../../lib/cn";
import { ApiError, iaApi, produtosApi } from "../../lib/api";
import type { CapacidadeIA } from "../../lib/api";

interface PropostaItem {
  chave: string;
  nome: string;
  preco: string;
  confianca?: "alta" | "media" | "baixa";
  selecionado: boolean;
}

interface AssistenteCatalogoModalProps {
  aberto: boolean;
  aoFechar: () => void;
  aoConcluir: () => void;
  capacidadesIA: CapacidadeIA[];
}

function badgeConfianca(confianca?: "alta" | "media" | "baixa") {
  if (confianca === "baixa" || confianca === undefined) return { texto: "Revise", className: "bg-warning-100 text-warning-700" };
  if (confianca === "media") return { texto: "Confira", className: "bg-warning-100 text-warning-700" };
  return { texto: "OK", className: "bg-success-100 text-success-700" };
}

export function AssistenteCatalogoModal({ aberto, aoFechar, aoConcluir, capacidadesIA }: AssistenteCatalogoModalProps) {
  const temEstruturacao = capacidadesIA.includes("estruturar_catalogo_texto");
  const temSugestaoSegmento = capacidadesIA.includes("sugerir_produtos_segmento");

  const [texto, setTexto] = useState("");
  const [propostas, setPropostas] = useState<PropostaItem[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [limiteAtingido, setLimiteAtingido] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [progressoSalvar, setProgressoSalvar] = useState<{ feitos: number; total: number } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (aberto) {
      setTexto("");
      setPropostas(null);
      setErro(null);
      setProgressoSalvar(null);
    }
  }, [aberto]);

  async function gerarPropostas() {
    if (!texto.trim()) {
      setErro("Descreva seu negócio ou os produtos/serviços que você vende.");
      return;
    }
    setErro(null);
    setLimiteAtingido(false);
    setProcessando(true);
    setPropostas(null);
    try {
      if (temEstruturacao) {
        const { dados } = await iaApi.estruturarCatalogo(texto);
        const itens: PropostaItem[] = [];
        dados.itens.forEach((item, indiceItem) => {
          item.variacoes.forEach((variacao, indiceVar) => {
            const nomeFinal = item.variacoes.length > 1 ? `${item.nome} — ${variacao.nome}` : item.nome;
            itens.push({
              chave: `${indiceItem}-${indiceVar}`,
              nome: nomeFinal,
              preco: variacao.preco !== null ? String(variacao.preco) : "",
              confianca: item.confianca,
              selecionado: true,
            });
          });
        });
        setPropostas(itens);
      } else if (temSugestaoSegmento) {
        const { dados } = await iaApi.sugerirProdutosPorSegmento(texto);
        setPropostas(dados.produtos.map((nome, indice) => ({ chave: String(indice), nome, preco: "", selecionado: true })));
      }
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível gerar sugestões agora.");
      setLimiteAtingido(e instanceof ApiError && e.codigo === "IA_LIMITE_MENSAL");
    } finally {
      setProcessando(false);
    }
  }

  async function iniciarGravacao() {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (evento) => chunksRef.current.push(evento.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setTranscrevendo(true);
        try {
          const base64 = await blobParaBase64(blob);
          const { texto: transcrito } = await iaApi.transcreverAudio(base64, blob.type || "audio/webm");
          setTexto((atual) => (atual ? `${atual} ${transcrito}` : transcrito));
        } catch (e) {
          setErro(e instanceof ApiError ? e.message : "Não foi possível transcrever o áudio.");
        } finally {
          setTranscrevendo(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setGravando(true);
    } catch {
      setErro("Não foi possível acessar o microfone. Verifique a permissão do navegador.");
    }
  }

  function pararGravacao() {
    mediaRecorderRef.current?.stop();
    setGravando(false);
  }

  function atualizarProposta(chave: string, campo: "nome" | "preco", valor: string) {
    setPropostas((atual) => atual?.map((p) => (p.chave === chave ? { ...p, [campo]: valor } : p)) ?? null);
  }

  function alternarSelecao(chave: string) {
    setPropostas((atual) => atual?.map((p) => (p.chave === chave ? { ...p, selecionado: !p.selecionado } : p)) ?? null);
  }

  function removerProposta(chave: string) {
    setPropostas((atual) => atual?.filter((p) => p.chave !== chave) ?? null);
  }

  const selecionados = propostas?.filter((p) => p.selecionado) ?? [];
  const algumSelecionadoSemPreco = selecionados.some((p) => !p.preco || Number(p.preco) <= 0);

  async function confirmarESalvar() {
    if (!propostas || selecionados.length === 0) return;
    setErro(null);
    setSalvando(true);
    setProgressoSalvar({ feitos: 0, total: selecionados.length });
    let feitos = 0;
    for (const item of selecionados) {
      try {
        await produtosApi.criar({ nome: item.nome, preco: Number(item.preco) });
        feitos += 1;
        setProgressoSalvar({ feitos, total: selecionados.length });
      } catch (e) {
        setErro(
          `Salvamos ${feitos} de ${selecionados.length} itens. ` +
            (e instanceof ApiError ? e.message : `Não foi possível salvar "${item.nome}".`)
        );
        setSalvando(false);
        if (feitos > 0) aoConcluir();
        return;
      }
    }
    setSalvando(false);
    aoConcluir();
  }

  return (
    <Modal titulo="Cadastrar catálogo com IA" aberto={aberto} aoFechar={aoFechar} tamanho="grande">
      <div className="flex flex-col gap-4">
        {erro && !limiteAtingido && <Alert tipo="erro">{erro}</Alert>}
        {limiteAtingido && (
          <Alert tipo="aviso">
            Você já experimentou o poder da IA do MOVA — seu plano atual atingiu o limite deste recurso este mês.{" "}
            <Link to="/planos" className="font-semibold underline">
              Desbloquear mais com o Business ou Pro
            </Link>
          </Alert>
        )}

        {!propostas && (
          <>
            <div>
              <label className="text-sm font-medium text-ink-700">
                Descreva seu negócio, ou os produtos/serviços que você vende (com preços, se souber)
              </label>
              <textarea
                className="mt-1.5 min-h-32 w-full rounded-lg border border-ink-200 bg-surface px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder='Ex: "Faço higienização de sofá. Cobro R$150 para dois lugares, R$180 para três lugares."'
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
            </div>

            {temEstruturacao && (
              <div className="flex items-center gap-3">
                {!gravando ? (
                  <Button type="button" variante="secundario" onClick={iniciarGravacao} disabled={transcrevendo}>
                    🎙️ Gravar áudio
                  </Button>
                ) : (
                  <Button type="button" variante="perigo" onClick={pararGravacao}>
                    ⏹ Parar gravação
                  </Button>
                )}
                {transcrevendo && <span className="text-sm text-ink-500">Transcrevendo áudio...</span>}
              </div>
            )}

            <p className="text-xs text-ink-500">
              A IA nunca inventa preços ou detalhes que você não informou — se algo não ficar claro, você poderá
              revisar e completar antes de salvar.
            </p>

            <Button onClick={gerarPropostas} carregando={processando} className="w-full">
              Gerar sugestões
            </Button>
          </>
        )}

        {propostas && (
          <>
            <p className="text-sm text-ink-600">
              Revise antes de salvar. Itens marcados com "Revise" não tiveram preço identificado com segurança —
              preencha antes de confirmar.
            </p>

            <div className="flex flex-col gap-2">
              {propostas.map((item) => {
                const badge = badgeConfianca(item.confianca);
                return (
                  <div key={item.chave} className="flex items-center gap-2 rounded-lg border border-ink-200 p-2">
                    <input
                      type="checkbox"
                      checked={item.selecionado}
                      onChange={() => alternarSelecao(item.chave)}
                      className="h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                    />
                    <Input
                      rotulo="Nome"
                      className="flex-[2]"
                      value={item.nome}
                      onChange={(e) => atualizarProposta(item.chave, "nome", e.target.value)}
                    />
                    <Input
                      rotulo="Preço (R$)"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-28 shrink-0"
                      value={item.preco}
                      onChange={(e) => atualizarProposta(item.chave, "preco", e.target.value)}
                    />
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", badge.className)}>{badge.texto}</span>
                    <Button tamanho="sm" variante="discreto" type="button" onClick={() => removerProposta(item.chave)}>
                      Remover
                    </Button>
                  </div>
                );
              })}
            </div>

            {algumSelecionadoSemPreco && (
              <Alert tipo="aviso">Preencha o preço de todos os itens selecionados antes de confirmar.</Alert>
            )}

            {progressoSalvar && (
              <p className="text-sm text-ink-500">
                Salvando {progressoSalvar.feitos} de {progressoSalvar.total}...
              </p>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variante="secundario" onClick={() => setPropostas(null)} disabled={salvando}>
                Voltar
              </Button>
              <Button
                type="button"
                onClick={confirmarESalvar}
                carregando={salvando}
                disabled={selecionados.length === 0 || algumSelecionadoSemPreco}
              >
                Confirmar e salvar ({selecionados.length})
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const resultado = reader.result as string;
      resolve(resultado.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
