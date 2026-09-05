import { useEffect, useState } from "react";
import { Card, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Alert } from "../ui/Alert";
import { ApiError, integracoesApi, whatsappApi } from "../../lib/api";
import type { StatusMercadoLivre, StatusWhatsApp, NotificacaoMercadoLivre } from "../../lib/api";
import { useModulos } from "../../context/ModulosContext";
import { useAuth } from "../../context/AuthContext";

export function IntegracoesCard() {
  const { moduloAtivo } = useModulos();
  const { empresa } = useAuth();
  const mercadoLivreAtivo = moduloAtivo("mercadolivre");
  const whatsappAtivo = moduloAtivo("whatsapp");
  const [ml, setMl] = useState<StatusMercadoLivre | null>(null);
  const [wa, setWa] = useState<StatusWhatsApp | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [numeroWa, setNumeroWa] = useState("");
  const [conectandoWa, setConectandoWa] = useState(false);
  const [notificacoesComErro, setNotificacoesComErro] = useState<NotificacaoMercadoLivre[]>([]);
  const [reprocessandoId, setReprocessandoId] = useState<string | null>(null);

  function carregarProblemasMercadoLivre() {
    integracoesApi
      .notificacoesMercadoLivre(true)
      .then(setNotificacoesComErro)
      .catch(() => setNotificacoesComErro([]));
  }

  function carregar() {
    integracoesApi
      .statusMercadoLivre()
      .then((status) => {
        setMl(status);
        if (status.conectado) carregarProblemasMercadoLivre();
      })
      .catch(() => setMl(null));
    whatsappApi
      .status()
      .then((r) => {
        setWa(r);
        // O MOVA já sabe o telefone/WhatsApp da empresa (cadastrado em "Minha
        // empresa") — só pergunta de novo se realmente não houver conta
        // conectada ainda, e mesmo assim já vem preenchido, nunca em branco
        // à toa.
        setNumeroWa(r.conta?.numeroTelefone ?? empresa?.whatsapp ?? empresa?.telefone ?? "");
      })
      .catch(() => setWa(null));
  }

  useEffect(carregar, []);

  async function reprocessarNotificacao(id: string) {
    setReprocessandoId(id);
    try {
      await integracoesApi.reprocessarNotificacaoMercadoLivre(id);
      carregarProblemasMercadoLivre();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível tentar novamente.");
    } finally {
      setReprocessandoId(null);
    }
  }

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
          {!mercadoLivreAtivo && (
            <p className="mt-1 text-sm text-ink-500">Ative o recurso "Mercado Livre" em Recursos do MOVA, acima, para conectar.</p>
          )}
          {mercadoLivreAtivo && ml && !ml.configurado && (
            <p className="mt-1 text-sm text-ink-500">Integração ainda não configurada neste ambiente pelo administrador do MOVA.</p>
          )}
          {mercadoLivreAtivo && ml?.configurado && !ml.conectado && (
            <div className="mt-2">
              <Button tamanho="sm" onClick={conectarMercadoLivre}>
                Conectar Mercado Livre
              </Button>
            </div>
          )}
          {mercadoLivreAtivo && ml?.configurado && ml.conectado && (
            <div className="mt-2 flex items-center gap-3">
              <span className="text-sm text-success-700">Conectado</span>
              <Button tamanho="sm" variante="secundario" onClick={desconectarMercadoLivre}>
                Desconectar
              </Button>
            </div>
          )}

          {notificacoesComErro.length > 0 && (
            <div className="mt-3 rounded-lg border border-warning-100 bg-warning-50 p-3">
              <p className="text-sm font-medium text-warning-700">
                {notificacoesComErro.length === 1
                  ? "1 atualização do Mercado Livre não foi aplicada automaticamente."
                  : `${notificacoesComErro.length} atualizações do Mercado Livre não foram aplicadas automaticamente.`}
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {notificacoesComErro.map((notificacao) => (
                  <li key={notificacao.id} className="flex items-center justify-between gap-3 text-sm text-ink-600">
                    <span className="truncate">Pedido do Mercado Livre (referência {notificacao.recursoId})</span>
                    <Button
                      tamanho="sm"
                      variante="secundario"
                      carregando={reprocessandoId === notificacao.id}
                      onClick={() => reprocessarNotificacao(notificacao.id)}
                    >
                      Tentar novamente
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-ink-200 p-4">
          <p className="text-sm font-semibold text-ink-900">WhatsApp</p>
          {!whatsappAtivo && (
            <p className="mt-1 text-sm text-ink-500">Ative o recurso "WhatsApp" em Recursos do MOVA, acima, para conectar.</p>
          )}
          {whatsappAtivo && wa && !wa.configurado && (
            <p className="mt-1 text-sm text-ink-500">
              Integração ainda não configurada neste ambiente pelo administrador do MOVA. Você já pode cadastrar o
              número da empresa abaixo.
            </p>
          )}
          {whatsappAtivo && (
            <>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Input rotulo="Número conectado" placeholder="(11) 91234-5678" value={numeroWa} onChange={(e) => setNumeroWa(e.target.value)} />
                </div>
                <Button tamanho="sm" onClick={conectarWhatsApp} carregando={conectandoWa}>
                  Salvar número
                </Button>
              </div>
              {wa?.conta?.conectada && <p className="mt-2 text-sm text-success-700">Conectado</p>}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
