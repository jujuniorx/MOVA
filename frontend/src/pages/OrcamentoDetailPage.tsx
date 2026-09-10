import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Skeleton } from "../components/ui/Skeleton";
import { PageHeader } from "../components/ui/PageHeader";
import { DocumentoOrcamento } from "../components/orcamentos/DocumentoOrcamento";
import { SugerirFollowupModal } from "../components/orcamentos/SugerirFollowupModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useModulos } from "../context/ModulosContext";
import { ApiError, empresaApi, orcamentosApi, vendasApi } from "../lib/api";
import type { OrcamentoDetalhe, ProcessoConfig, StatusOrcamento } from "../lib/api";
import { montarLinkCompartilhamento } from "../lib/whatsapp";

const MENSAGEM_SUCESSO_STATUS: Record<StatusOrcamento, string> = {
  RASCUNHO: "Orçamento voltou para rascunho",
  ENVIADO: "Orçamento enviado",
  APROVADO: "Orçamento aprovado",
  RECUSADO: "Orçamento recusado",
};

const MENSAGEM_CONFIRMACAO: Partial<Record<StatusOrcamento, string>> = {
  APROVADO: "Depois de aprovado, este orçamento não poderá mais ser editado. Deseja continuar?",
  RECUSADO: "Depois de recusado, este orçamento não poderá mais ser editado. Deseja continuar?",
};

const TITULO_CONFIRMACAO: Partial<Record<StatusOrcamento, string>> = {
  APROVADO: "Aprovar orçamento",
  RECUSADO: "Recusar orçamento",
};

export function OrcamentoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { empresa } = useAuth();
  const { mostrarSucesso } = useToast();
  const { moduloAtivo } = useModulos();
  const [orcamento, setOrcamento] = useState<OrcamentoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [statusEmConfirmacao, setStatusEmConfirmacao] = useState<StatusOrcamento | null>(null);
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  const [erroStatus, setErroStatus] = useState<string | null>(null);

  const [convertendoVenda, setConvertendoVenda] = useState(false);
  const [erroConversao, setErroConversao] = useState<string | null>(null);

  const [processo, setProcesso] = useState<ProcessoConfig | null>(null);
  const [atualizandoEtapa, setAtualizandoEtapa] = useState(false);
  const [followupAberto, setFollowupAberto] = useState(false);

  useEffect(() => {
    if (!id) return;
    setCarregando(true);
    orcamentosApi
      .obter(id)
      .then(setOrcamento)
      .catch((erroCapturado) =>
        setErro(
          erroCapturado instanceof ApiError ? erroCapturado.message : "Não foi possível carregar o orçamento."
        )
      )
      .finally(() => setCarregando(false));

    empresaApi
      .obterProcesso("ORCAMENTO")
      .then(setProcesso)
      .catch(() => setProcesso(null));
  }, [id]);

  async function aoAlterarEtapa(etapaProcessoId: string) {
    if (!orcamento) return;
    setAtualizandoEtapa(true);
    try {
      const atualizado = await orcamentosApi.atualizarEtapa(orcamento.id, etapaProcessoId || null);
      setOrcamento(atualizado);
    } catch (erroCapturado) {
      setErroStatus(
        erroCapturado instanceof ApiError ? erroCapturado.message : "Não foi possível atualizar a etapa."
      );
    } finally {
      setAtualizandoEtapa(false);
    }
  }

  async function executarMudancaStatus(novoStatus: StatusOrcamento) {
    if (!orcamento) return;
    setAtualizandoStatus(true);
    setErroStatus(null);
    try {
      const atualizado = await orcamentosApi.atualizarStatus(orcamento.id, novoStatus);
      setOrcamento(atualizado);
      setStatusEmConfirmacao(null);
      mostrarSucesso(MENSAGEM_SUCESSO_STATUS[novoStatus]);
    } catch (erroCapturado) {
      setErroStatus(
        erroCapturado instanceof ApiError ? erroCapturado.message : "Não foi possível atualizar o status."
      );
    } finally {
      setAtualizandoStatus(false);
    }
  }

  function pedirMudancaStatus(novoStatus: StatusOrcamento) {
    if (MENSAGEM_CONFIRMACAO[novoStatus]) {
      setErroStatus(null);
      setStatusEmConfirmacao(novoStatus);
    } else {
      executarMudancaStatus(novoStatus);
    }
  }

  async function aoConverterEmVenda() {
    if (!orcamento || orcamento.status !== "APROVADO" || orcamento.vendaGerada) return;
    setConvertendoVenda(true);
    setErroConversao(null);
    try {
      await vendasApi.criarAPartirDeOrcamento(orcamento.id);
      const atualizado = await orcamentosApi.obter(orcamento.id);
      setOrcamento(atualizado);
      mostrarSucesso("Venda registrada a partir deste orçamento");
    } catch (erroCapturado) {
      // 409 cobre tanto "já existe venda" (corrida entre duas abas) quanto
      // "não está mais aprovado" — em ambos os casos recarregamos o
      // orçamento para a tela refletir o estado real em vez de ficar presa
      // num botão que não pode mais funcionar.
      setErroConversao(
        erroCapturado instanceof ApiError ? erroCapturado.message : "Não foi possível converter o orçamento em venda."
      );
      orcamentosApi.obter(orcamento.id).then(setOrcamento).catch(() => {});
    } finally {
      setConvertendoVenda(false);
    }
  }

  async function aoCompartilhar() {
    if (!orcamento) return;
    window.open(linkWhatsapp, "_blank", "noopener,noreferrer");
    if (orcamento.status === "RASCUNHO") {
      // Compartilhar é, na prática, enviar — marcamos o status automaticamente,
      // sem travar a abertura do WhatsApp se isso falhar por algum motivo.
      try {
        const atualizado = await orcamentosApi.atualizarStatus(orcamento.id, "ENVIADO");
        setOrcamento(atualizado);
        mostrarSucesso(MENSAGEM_SUCESSO_STATUS.ENVIADO);
      } catch {
        // silencioso: o compartilhamento já aconteceu
      }
    }
  }

  if (carregando) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-3">
          {[1, 2].map((chave) => (
            <Skeleton key={chave} className="h-24" />
          ))}
        </div>
      </AppLayout>
    );
  }

  if (erro || !orcamento) {
    return (
      <AppLayout>
        <Alert tipo="erro">{erro ?? "Orçamento não encontrado."}</Alert>
        <Link to="/painel" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
          Voltar ao Início
        </Link>
      </AppLayout>
    );
  }

  const contatoCliente = [orcamento.cliente.whatsapp, orcamento.cliente.telefone, orcamento.cliente.email]
    .filter(Boolean)
    .join(" · ");

  const linkPublico = `${window.location.origin}/orcamentos/publico/${orcamento.id}`;
  const linkWhatsapp = montarLinkCompartilhamento({
    nomeCliente: orcamento.cliente.nome,
    nomeEmpresa: empresa?.nome ?? "",
    total: orcamento.total,
    link: linkPublico,
    whatsappCliente: orcamento.cliente.whatsapp,
    telefoneCliente: orcamento.cliente.telefone,
  });

  return (
    <AppLayout>
      <Link to="/orcamentos" className="text-sm font-medium text-brand-600 hover:underline">
        ← Voltar para orçamentos
      </Link>

      <div className="mt-4">
        <PageHeader
          titulo={`Orçamento #${orcamento.numero} — ${orcamento.cliente.nome}`}
          acao={
            <Button variante="whatsapp" onClick={aoCompartilhar}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 004.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.13h-.01a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 01-1.26-4.36c0-4.55 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 012.41 5.82c0 4.55-3.7 8.22-8.24 8.22zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.06s.89 2.39 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.23-.17-.48-.29z" />
              </svg>
              Compartilhar no WhatsApp
            </Button>
          }
        />
      </div>

      <Card className="mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Status do orçamento</p>
            <div className="mt-1.5">
              <StatusBadge key={orcamento.status} status={orcamento.status} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {orcamento.status === "RASCUNHO" && (
              <Button carregando={atualizandoStatus} onClick={() => pedirMudancaStatus("ENVIADO")}>
                Marcar como enviado
              </Button>
            )}

            {orcamento.status === "ENVIADO" && (
              <>
                <Button variante="secundario" onClick={() => setFollowupAberto(true)}>
                  Sugerir follow-up
                </Button>
                <Button
                  variante="sucesso"
                  carregando={atualizandoStatus}
                  onClick={() => pedirMudancaStatus("APROVADO")}
                >
                  Aprovar orçamento
                </Button>
                <Button
                  variante="perigo"
                  carregando={atualizandoStatus}
                  onClick={() => pedirMudancaStatus("RECUSADO")}
                >
                  Recusar orçamento
                </Button>
              </>
            )}

            {(orcamento.status === "APROVADO" || orcamento.status === "RECUSADO") && (
              <button
                type="button"
                onClick={() => pedirMudancaStatus("RASCUNHO")}
                className="text-sm font-medium text-ink-500 hover:text-ink-700 hover:underline"
              >
                Corrigir: voltar para rascunho
              </button>
            )}
          </div>
        </div>

        {orcamento.status === "APROVADO" && (
          <div className="mt-3 border-t border-ink-100 pt-3">
            {orcamento.vendaGerada ? (
              <p className="text-sm text-success-700">
                Este orçamento já virou a{" "}
                <Link to="/operacoes?aba=vendas" className="font-medium underline">
                  venda #{orcamento.vendaGerada.numero}
                </Link>
                .
              </p>
            ) : moduloAtivo("vendas") ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-600">Orçamento aprovado — pronto para virar uma venda.</p>
                <Button carregando={convertendoVenda} onClick={aoConverterEmVenda}>
                  Converter em venda
                </Button>
              </div>
            ) : null}
            {erroConversao && (
              <div className="mt-2">
                <Alert tipo="erro">{erroConversao}</Alert>
              </div>
            )}
          </div>
        )}

        {orcamento.respondidoPeloClienteEm && (
          <div className="mt-3 border-t border-ink-100 pt-3">
            <p className="text-sm text-ink-600">
              O próprio cliente {orcamento.status === "APROVADO" ? "aprovou" : "recusou"} este orçamento pelo link
              público em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(orcamento.respondidoPeloClienteEm))}.
            </p>
            {orcamento.motivoRecusa && (
              <p className="mt-1 text-sm text-ink-600">Motivo informado: "{orcamento.motivoRecusa}"</p>
            )}
          </div>
        )}

        {erroStatus && (
          <div className="mt-3">
            <Alert tipo="erro">{erroStatus}</Alert>
          </div>
        )}

        {(() => {
          const etapasDoMomento = processo?.etapas.filter((etapa) => etapa.statusBase === orcamento.status) ?? [];
          if (etapasDoMomento.length === 0) return null;
          return (
            <div className="mt-4 border-t border-ink-100 pt-4 sm:max-w-xs">
              <Select
                rotulo="Etapa do seu processo"
                value={orcamento.etapaProcessoId ?? ""}
                onChange={(evento) => aoAlterarEtapa(evento.target.value)}
                disabled={atualizandoEtapa}
              >
                <option value="">Sem etapa definida</option>
                {etapasDoMomento.map((etapa) => (
                  <option key={etapa.id} value={etapa.id}>
                    {etapa.nome}
                  </option>
                ))}
              </Select>
            </div>
          );
        })()}
      </Card>

      <div className="mt-4">
        <DocumentoOrcamento
          nomeEmpresa={empresa?.nome ?? ""}
          logoUrl={empresa?.logoUrl}
          corPrimaria={empresa?.corPrimaria}
          numero={orcamento.numero}
          data={orcamento.data}
          validade={orcamento.validade}
          nomeCliente={orcamento.cliente.nome}
          contatoCliente={contatoCliente || undefined}
          itens={orcamento.itens}
          subtotal={orcamento.subtotal}
          desconto={orcamento.desconto}
          total={orcamento.total}
          observacoes={orcamento.observacoes}
          statusBadge={<StatusBadge key={orcamento.status} status={orcamento.status} />}
        />
      </div>

      <ConfirmDialog
        titulo={statusEmConfirmacao ? (TITULO_CONFIRMACAO[statusEmConfirmacao] ?? "Confirmar") : "Confirmar"}
        mensagem={statusEmConfirmacao ? (MENSAGEM_CONFIRMACAO[statusEmConfirmacao] ?? "") : ""}
        aberto={statusEmConfirmacao !== null}
        confirmando={atualizandoStatus}
        rotuloConfirmar={statusEmConfirmacao === "APROVADO" ? "Aprovar" : "Recusar"}
        varianteConfirmar={statusEmConfirmacao === "APROVADO" ? "sucesso" : "perigo"}
        aoConfirmar={() => statusEmConfirmacao && executarMudancaStatus(statusEmConfirmacao)}
        aoCancelar={() => setStatusEmConfirmacao(null)}
      />

      <SugerirFollowupModal
        aberto={followupAberto}
        aoFechar={() => setFollowupAberto(false)}
        orcamentoId={orcamento.id}
        numeroOrcamento={orcamento.numero}
        whatsappCliente={orcamento.cliente.whatsapp}
        telefoneCliente={orcamento.cliente.telefone}
      />
    </AppLayout>
  );
}
