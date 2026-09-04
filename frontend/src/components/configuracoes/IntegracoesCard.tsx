import { useEffect, useState } from "react";
import { Card, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Alert } from "../ui/Alert";
import { ApiError, integracoesApi, whatsappApi } from "../../lib/api";
import type { StatusMercadoLivre, StatusWhatsApp } from "../../lib/api";

export function IntegracoesCard() {
  const [ml, setMl] = useState<StatusMercadoLivre | null>(null);
  const [wa, setWa] = useState<StatusWhatsApp | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [numeroWa, setNumeroWa] = useState("");
  const [conectandoWa, setConectandoWa] = useState(false);

  function carregar() {
    integracoesApi
      .statusMercadoLivre()
      .then(setMl)
      .catch(() => setMl(null));
    whatsappApi
      .status()
      .then((r) => {
        setWa(r);
        setNumeroWa(r.conta?.numeroTelefone ?? "");
      })
      .catch(() => setWa(null));
  }

  useEffect(carregar, []);

  async function conectarMercadoLivre() {
    setErro(null);
    try {
      const { url } = await integracoesApi.conectarMercadoLivre();
      window.location.href = url;
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível iniciar a conexão com o Mercado Livre.");
    }
  }

  async function desconectarMercadoLivre() {
    try {
      await integracoesApi.desconectarMercadoLivre();
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível desconectar.");
    }
  }

  async function conectarWhatsApp() {
    setErro(null);
    setConectandoWa(true);
    try {
      await whatsappApi.conectar(numeroWa);
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível salvar o número do WhatsApp.");
    } finally {
      setConectandoWa(false);
    }
  }

  return (
    <Card>
      <CardHeader titulo="Integrações" descricao="Conecte canais externos ao MOVA." />
      <div className="mt-4 flex flex-col gap-6">
        {erro && <Alert tipo="erro">{erro}</Alert>}

        <div className="rounded-lg border border-ink-200 p-4">
          <p className="text-sm font-semibold text-ink-900">Mercado Livre</p>
          {ml && !ml.configurado && (
            <p className="mt-1 text-sm text-ink-500">Integração ainda não configurada neste ambiente pelo administrador do MOVA.</p>
          )}
          {ml?.configurado && !ml.conectado && (
            <div className="mt-2">
              <Button tamanho="sm" onClick={conectarMercadoLivre}>
                Conectar Mercado Livre
              </Button>
            </div>
          )}
          {ml?.configurado && ml.conectado && (
            <div className="mt-2 flex items-center gap-3">
              <span className="text-sm text-success-700">Conectado</span>
              <Button tamanho="sm" variante="secundario" onClick={desconectarMercadoLivre}>
                Desconectar
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-ink-200 p-4">
          <p className="text-sm font-semibold text-ink-900">WhatsApp</p>
          {wa && !wa.configurado && (
            <p className="mt-1 text-sm text-ink-500">
              Integração ainda não configurada neste ambiente pelo administrador do MOVA. Você já pode cadastrar o
              número da empresa abaixo.
            </p>
          )}
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input rotulo="Número conectado" placeholder="(11) 91234-5678" value={numeroWa} onChange={(e) => setNumeroWa(e.target.value)} />
            </div>
            <Button tamanho="sm" onClick={conectarWhatsApp} carregando={conectandoWa}>
              Salvar número
            </Button>
          </div>
          {wa?.conta?.conectada && <p className="mt-2 text-sm text-success-700">Conectado</p>}
        </div>
      </div>
    </Card>
  );
}
