import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader } from "../ui/Card";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { ApiError, empresaApi, iaApi } from "../../lib/api";
import type { PerfilOperacional, PerfilOperacionalRascunho } from "../../lib/api";
import { useGravacaoAudio } from "../../hooks/useGravacaoAudio";

/**
 * "Conte como sua empresa trabalha" — mesmo motor usado no passo 0 do
 * OnboardingWizard (empresaApi.interpretarPerfilOperacional/confirmarPerfilOperacional),
 * reaproveitado aqui como um formulário independente para quem pulou o
 * onboarding ou quer atualizar a descrição depois. Fluxo em dois passos:
 * descrever → MOVA interpreta → pessoa confirma → só então os módulos
 * sugeridos são aplicados de verdade.
 */
export function PerfilOperacionalForm({ aoConcluir }: { aoConcluir?: () => void }) {
  const [perfilAtual, setPerfilAtual] = useState<PerfilOperacional | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [descricaoNegocio, setDescricaoNegocio] = useState("");
  const [rascunho, setRascunho] = useState<PerfilOperacionalRascunho | null>(null);
  const [fase, setFase] = useState<"pergunta" | "interpretando" | "confirmacao" | "aplicando">("pergunta");
  const [erro, setErro] = useState<string | null>(null);
  const [temAudio, setTemAudio] = useState(false);
  const [respostaPendente, setRespostaPendente] = useState("");
  const [respondendoPergunta, setRespondendoPergunta] = useState(false);

  const {
    gravando,
    transcrevendo,
    erro: erroAudio,
    iniciarGravacao,
    pararGravacao,
  } = useGravacaoAudio((transcrito) => setDescricaoNegocio((atual) => (atual ? `${atual} ${transcrito}` : transcrito)));

  useEffect(() => {
    empresaApi
      .obterPerfilOperacional()
      .then((r) => setPerfilAtual(r.perfilOperacional))
      .catch(() => {})
      .finally(() => setCarregando(false));
    iaApi
      .capacidades()
      .then((r) => setTemAudio(r.capacidades.includes("estruturar_catalogo_texto")))
      .catch(() => setTemAudio(false));
  }, []);

  async function interpretar() {
    if (!descricaoNegocio.trim()) return;
    setErro(null);
    setFase("interpretando");
    try {
      const resultado = await empresaApi.interpretarPerfilOperacional(descricaoNegocio.trim());
      setRascunho(resultado);
      setFase("confirmacao");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível entender a descrição agora.");
      setFase("pergunta");
    }
  }

  // Responde só a pergunta pendente, sem reescrever a descrição inteira: o
  // texto original é preservado e a resposta é anexada a ele antes de pedir
  // ao MOVA para entender de novo — o mesmo ciclo ENTENDE→PERGUNTA que pode
  // se repetir se a resposta ainda deixar algo em aberto.
  async function aoResponderPergunta() {
    if (!rascunho || !respostaPendente.trim()) return;
    const textoCombinado = `${rascunho.descricaoNegocio}\n${respostaPendente.trim()}`.slice(0, 1000);
    setErro(null);
    setRespondendoPergunta(true);
    try {
      const resultado = await empresaApi.interpretarPerfilOperacional(textoCombinado);
      setDescricaoNegocio(textoCombinado);
      setRascunho(resultado);
      setRespostaPendente("");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível entender a resposta agora.");
    } finally {
      setRespondendoPergunta(false);
    }
  }

  async function confirmar() {
    if (!rascunho) return;
    setErro(null);
    setFase("aplicando");
    try {
      const resultado = await empresaApi.confirmarPerfilOperacional(rascunho);
      setPerfilAtual(resultado.perfilOperacional);
      setRascunho(null);
      setDescricaoNegocio("");
      setFase("pergunta");
      aoConcluir?.();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível salvar agora.");
      setFase("confirmacao");
    }
  }

  if (carregando) return null;

  return (
    <div className="flex flex-col gap-4">
      {(erro || erroAudio) && <Alert tipo="erro">{erro || erroAudio}</Alert>}

      {perfilAtual && fase === "pergunta" && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900">
          Hoje o MOVA entende que sua empresa: {perfilAtual.resumo}. Você pode alterar isso quando quiser em
          Configurações → Recursos do MOVA.
        </div>
      )}

      {(fase === "pergunta" || fase === "interpretando") && (
        <>
          <Textarea
            rotulo="O que sua empresa faz e vende ou oferece"
            placeholder='Ex: "Vendo ferramentas e máquinas para construção" ou "Faço limpeza de sofás, colchões e tapetes"'
            value={descricaoNegocio}
            onChange={(e) => setDescricaoNegocio(e.target.value)}
            disabled={fase === "interpretando"}
          />

          {temAudio ? (
            <div className="flex items-center gap-3">
              {!gravando ? (
                <Button type="button" variante="secundario" onClick={iniciarGravacao} disabled={transcrevendo || fase === "interpretando"}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-14 0M12 18v3" />
                  </svg>
                  Prefere falar? Conte por áudio
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
          ) : (
            <p className="text-xs text-ink-500">
              Prefere contar por áudio em vez de digitar? Esse recurso está disponível nos planos Business e Pro —{" "}
              <Link to="/planos" className="font-medium text-brand-600 hover:underline">
                ver planos
              </Link>
              .
            </p>
          )}

          <div>
            <Button type="button" onClick={interpretar} carregando={fase === "interpretando"} disabled={!descricaoNegocio.trim()}>
              {perfilAtual ? "Atualizar" : "Contar ao MOVA"}
            </Button>
          </div>
        </>
      )}

      {(fase === "confirmacao" || fase === "aplicando") && rascunho && (
        <>
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
            Entendi! Vou configurar o MOVA para {rascunho.resumo}.
          </div>
          {rascunho.perguntaPendente && (
            <div className="rounded-xl border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800">
              <p className="font-medium">{rascunho.perguntaPendente}</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={respostaPendente}
                  onChange={(e) => setRespostaPendente(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      aoResponderPergunta();
                    }
                  }}
                  placeholder="Digite sua resposta aqui"
                  disabled={respondendoPergunta || fase === "aplicando"}
                  className="min-h-10 flex-1 rounded-lg border border-warning-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <Button
                  type="button"
                  tamanho="sm"
                  onClick={aoResponderPergunta}
                  carregando={respondendoPergunta}
                  disabled={!respostaPendente.trim() || fase === "aplicando"}
                >
                  Responder
                </Button>
              </div>
              <p className="mt-2 text-xs text-warning-700">
                Ou confirme assim mesmo e ajuste depois quando quiser.
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button type="button" onClick={confirmar} carregando={fase === "aplicando"} disabled={respondendoPergunta}>
              Confirmar
            </Button>
            <Button
              type="button"
              variante="secundario"
              onClick={() => setFase("pergunta")}
              disabled={fase === "aplicando" || respondendoPergunta}
            >
              {rascunho.perguntaPendente ? "Reescrever do zero" : "Cancelar"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function PerfilOperacionalCard() {
  return (
    <Card>
      <CardHeader
        titulo="Como sua empresa trabalha"
        descricao="Conte para o MOVA o que sua empresa faz e vende — isso ajuda a sugerir os recursos certos para o seu negócio."
      />
      <div className="mt-4">
        <PerfilOperacionalForm />
      </div>
    </Card>
  );
}
