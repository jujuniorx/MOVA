import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
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
            <Textarea
              rotulo="Descreva seu negócio, ou os produtos/serviços que você vende (com preços, se souber)"
              placeholder='Ex: "Faço higienização de sofá. Cobro R$150 para dois lugares, R$180 para três lugares."'
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />

            {temEstruturacao && (
              <div className="flex items-center gap-3">
                {!gravando ? (
                  <Button type="button" variante="secundario" onClick={iniciarGravacao} disabled={transcrevendo}>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-14 0M12 18v3" />
                    </svg>
                    Gravar áudio
                  </Button>
                ) : (
                  <Button type="button" variante="perigo" onClick={pararGravacao}>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <rect x="6" y="6" width="12" height="12" rx="1.5" />
                    </svg>
                    Parar gravação
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

            <ul className="flex flex-col gap-3">
              {propostas.map((item) => {
                const badge = badgeConfianca(item.confianca);
                return (
                  <li key={item.chave} className="rounded-lg border border-ink-200 p-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.selecionado}
                        onChange={() => alternarSelecao(item.chave)}
                        aria-label={`Incluir "${item.nome}"`}
                        className="mt-7 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                      />
                      <Input
                        rotulo="Nome"
                        className="flex-1"
                        value={item.nome}
                        onChange={(e) => atualizarProposta(item.chave, "nome", e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removerProposta(item.chave)}
                        aria-label="Remover item"
                        className="mt-6 shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-danger-600"
                      >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-3 flex items-end gap-3">
                      <div className="w-32">
                        <Input
                          rotulo="Preço (R$)"
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.preco}
                          onChange={(e) => atualizarProposta(item.chave, "preco", e.target.value)}
                        />
                      </div>
                      <span className={cn("mb-2.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", badge.className)}>{badge.texto}</span>
                    </div>
                  </li>
                );
              })}
            </ul>

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
