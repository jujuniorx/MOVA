import { useEffect, useState } from "react";
import { Card, CardHeader } from "../ui/Card";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { ApiError, empresaApi } from "../../lib/api";
import type { PerfilOperacional, PerfilOperacionalRascunho } from "../../lib/api";

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

  useEffect(() => {
    empresaApi
      .obterPerfilOperacional()
      .then((r) => setPerfilAtual(r.perfilOperacional))
      .catch(() => {})
      .finally(() => setCarregando(false));
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
      {erro && <Alert tipo="erro">{erro}</Alert>}

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
          <div className="flex gap-3">
            <Button type="button" onClick={confirmar} carregando={fase === "aplicando"}>
              Confirmar
            </Button>
            <Button type="button" variante="secundario" onClick={() => setFase("pergunta")} disabled={fase === "aplicando"}>
              Cancelar
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
