import { useEffect, useState } from "react";
import { Card, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { ApiError, usuariosApi, AREAS_FOCO_ROTULOS } from "../../lib/api";
import type { PerfilTrabalho, PerfilTrabalhoRascunho } from "../../lib/api";

/**
 * "Conte como você trabalha" — o motor adaptativo do MOVA (Central de
 * Prioridades, por enquanto) usa isso só para ORDENAR o que já existe pela
 * relevância para esta pessoa, nunca para esconder ou inventar dado nenhum.
 * Fluxo obrigatório em dois passos, igual ao Perfil Operacional da empresa:
 * descrever → MOVA interpreta → mostra o que entendeu → pessoa confirma →
 * só então aplica.
 */
export function PerfilTrabalhoCard() {
  const [cargo, setCargo] = useState("");
  const [perfilAtual, setPerfilAtual] = useState<PerfilTrabalho | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [descricaoLivre, setDescricaoLivre] = useState("");
  const [rascunho, setRascunho] = useState<PerfilTrabalhoRascunho | null>(null);
  const [fase, setFase] = useState<"pergunta" | "interpretando" | "confirmacao" | "aplicando">("pergunta");
  const [salvandoCargo, setSalvandoCargo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucessoCargo, setSucessoCargo] = useState(false);

  useEffect(() => {
    usuariosApi
      .obterPerfilTrabalho()
      .then((r) => {
        setCargo(r.cargo ?? "");
        setPerfilAtual(r.perfilTrabalho);
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  async function salvarCargo() {
    setErro(null);
    setSucessoCargo(false);
    setSalvandoCargo(true);
    try {
      await usuariosApi.atualizarCargo(cargo.trim() || null);
      setSucessoCargo(true);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível salvar agora.");
    } finally {
      setSalvandoCargo(false);
    }
  }

  async function interpretar() {
    if (!descricaoLivre.trim()) return;
    setErro(null);
    setFase("interpretando");
    try {
      const resultado = await usuariosApi.interpretarPerfilTrabalho(descricaoLivre.trim());
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
      const resultado = await usuariosApi.confirmarPerfilTrabalho(rascunho);
      setPerfilAtual(resultado.perfilTrabalho);
      setRascunho(null);
      setDescricaoLivre("");
      setFase("pergunta");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível salvar agora.");
      setFase("confirmacao");
    }
  }

  if (carregando) return null;

  return (
    <Card>
      <CardHeader
        titulo="Como você trabalha"
        descricao="Isso ajuda o MOVA a mostrar primeiro o que é mais relevante para você na Central de Prioridades — nunca esconde nada dos outros dados."
      />
      <div className="mt-4 flex flex-col gap-4">
        {erro && <Alert tipo="erro">{erro}</Alert>}
        {sucessoCargo && <Alert tipo="sucesso">Salvo.</Alert>}

        <Input
          rotulo="Sua função na empresa"
          placeholder="Ex.: Proprietário, Secretária, Vendedor"
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
        />
        <div>
          <Button type="button" variante="secundario" onClick={salvarCargo} carregando={salvandoCargo}>
            Salvar função
          </Button>
        </div>

        <div className="border-t border-ink-100 pt-4">
          {perfilAtual && fase === "pergunta" && (
            <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900">
              Hoje o MOVA entende que você cuida de: {perfilAtual.areasFoco.map((a) => AREAS_FOCO_ROTULOS[a] ?? a).join(", ")}.
            </div>
          )}

          {(fase === "pergunta" || fase === "interpretando") && (
            <>
              <Textarea
                rotulo="Descreva o que você faz no dia a dia"
                placeholder='Ex: "Respondo o WhatsApp, organizo a agenda, acompanho clientes e faço relatórios."'
                value={descricaoLivre}
                onChange={(e) => setDescricaoLivre(e.target.value)}
                disabled={fase === "interpretando"}
              />
              <div className="mt-3">
                <Button type="button" onClick={interpretar} carregando={fase === "interpretando"}>
                  {perfilAtual ? "Atualizar" : "Entender meu trabalho"}
                </Button>
              </div>
            </>
          )}

          {(fase === "confirmacao" || fase === "aplicando") && rascunho && (
            <>
              <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
                Entendi! Você cuida de: {rascunho.areasFoco.map((a) => AREAS_FOCO_ROTULOS[a] ?? a).join(", ")}.
              </div>
              <div className="mt-3 flex gap-3">
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
      </div>
    </Card>
  );
}
