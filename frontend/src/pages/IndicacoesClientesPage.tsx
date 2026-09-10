import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { PageHeader } from "../components/ui/PageHeader";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import {
  ApiError,
  clientesApi,
  indicacoesClientesApi,
  usuariosApi,
  vendasApi,
} from "../lib/api";
import type { Cliente, IndicacaoCliente, IndicacaoClienteInput, ResumoIndicador, StatusIndicacaoCliente, UsuarioEquipe, Venda } from "../lib/api";
import { montarLinkChat } from "../lib/whatsapp";

const ROTULO_STATUS: Record<StatusIndicacaoCliente, string> = {
  PENDENTE: "Pendente",
  CONVERTIDA: "Convertida",
  CANCELADA: "Cancelada",
};

const COR_STATUS: Record<StatusIndicacaoCliente, string> = {
  PENDENTE: "bg-warning-100 text-warning-700",
  CONVERTIDA: "bg-success-100 text-success-700",
  CANCELADA: "bg-ink-100 text-ink-600",
};

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function linkInstagram(valor: string): string {
  if (valor.startsWith("http://") || valor.startsWith("https://")) return valor;
  const usuario = valor.replace(/^@/, "");
  return `https://instagram.com/${usuario}`;
}

const FORM_VAZIO: IndicacaoClienteInput = {
  indicadorNome: "",
  indicadorWhatsapp: "",
  indicadorInstagram: "",
  indicadoNome: "",
  indicadoWhatsapp: "",
  indicadoInstagram: "",
  codigoVoucher: "",
  observacoes: "",
};

export function IndicacoesClientesPage() {
  const [indicacoes, setIndicacoes] = useState<IndicacaoCliente[] | null>(null);
  const [resumo, setResumo] = useState<ResumoIndicador[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [equipe, setEquipe] = useState<UsuarioEquipe[]>([]);
  const [filtro, setFiltro] = useState<StatusIndicacaoCliente | "TODAS">("PENDENTE");
  const [erro, setErro] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<IndicacaoClienteInput>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const [indicacaoParaConverter, setIndicacaoParaConverter] = useState<IndicacaoCliente | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendaEscolhidaId, setVendaEscolhidaId] = useState("");
  const [convertendo, setConvertendo] = useState(false);

  const [indicacaoParaCancelar, setIndicacaoParaCancelar] = useState<IndicacaoCliente | null>(null);
  const [cancelando, setCancelando] = useState(false);

  function carregar() {
    setIndicacoes(null);
    indicacoesClientesApi
      .listar(filtro === "TODAS" ? undefined : filtro)
      .then(setIndicacoes)
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar as indicações."));
    indicacoesClientesApi.resumo().then(setResumo).catch(() => setResumo([]));
  }

  useEffect(carregar, [filtro]);
  useEffect(() => {
    clientesApi.listar().then(setClientes).catch(() => setClientes([]));
    usuariosApi.listar().then(setEquipe).catch(() => setEquipe([]));
  }, []);

  function abrirNovaIndicacao() {
    setForm(FORM_VAZIO);
    setErro(null);
    setModalAberto(true);
  }

  function selecionarClienteIndicado(clienteId: string) {
    const cliente = clientes.find((c) => c.id === clienteId);
    setForm((atual) => ({
      ...atual,
      clienteId: clienteId || undefined,
      indicadoNome: cliente ? cliente.nome : atual.indicadoNome,
      indicadoWhatsapp: cliente?.whatsapp || cliente?.telefone || atual.indicadoWhatsapp,
    }));
  }

  function selecionarIndicadorUsuario(usuarioId: string) {
    const membro = equipe.find((u) => u.id === usuarioId);
    setForm((atual) => ({
      ...atual,
      indicadorUsuarioId: usuarioId || undefined,
      indicadorNome: membro ? membro.nome : atual.indicadorNome,
    }));
  }

  async function salvarIndicacao(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await indicacoesClientesApi.criar(form);
      setModalAberto(false);
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível registrar a indicação.");
    } finally {
      setSalvando(false);
    }
  }

  function abrirConversao(indicacao: IndicacaoCliente) {
    setIndicacaoParaConverter(indicacao);
    setVendaEscolhidaId("");
    vendasApi
      .listar()
      .then((todas) => setVendas(indicacao.clienteId ? todas.filter((v) => v.cliente?.id === indicacao.clienteId) : todas))
      .catch(() => setVendas([]));
  }

  async function confirmarConversao() {
    if (!indicacaoParaConverter || !vendaEscolhidaId) return;
    setConvertendo(true);
    setErro(null);
    try {
      await indicacoesClientesApi.converter(indicacaoParaConverter.id, vendaEscolhidaId);
      setIndicacaoParaConverter(null);
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível converter a indicação.");
    } finally {
      setConvertendo(false);
    }
  }

  async function confirmarCancelamento() {
    if (!indicacaoParaCancelar) return;
    setCancelando(true);
    try {
      await indicacoesClientesApi.cancelar(indicacaoParaCancelar.id);
      setIndicacaoParaCancelar(null);
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível cancelar a indicação.");
    } finally {
      setCancelando(false);
    }
  }

  const topIndicadores = useMemo(() => resumo.slice(0, 5), [resumo]);

  return (
    <AppLayout>
      <PageHeader
        titulo="Indicações de clientes"
        subtitulo="Quem indicou quem, o que ganhou e o que já virou venda."
        acao={<Button onClick={abrirNovaIndicacao}>Nova indicação</Button>}
      />

      {erro && (
        <div className="mt-4">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {topIndicadores.length > 0 && (
        <Card className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Total acumulado por quem indica</p>
          <ul className="mt-3 flex flex-col gap-2">
            {topIndicadores.map((item) => (
              <li key={`${item.indicadorUsuarioId ?? item.indicadorNome}`} className="flex items-center justify-between text-sm">
                <span className="text-ink-700">{item.indicadorNome}</span>
                <span className="font-medium text-ink-900">
                  {item.totalConvertidas} indicação{item.totalConvertidas === 1 ? "" : "ões"} convertida{item.totalConvertidas === 1 ? "" : "s"}
                  {item.totalValor > 0 ? ` · ${formatoMoeda.format(item.totalValor)}` : ""}
                  {item.totalPontos > 0 ? ` · ${item.totalPontos} pts` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {(["PENDENTE", "CONVERTIDA", "CANCELADA", "TODAS"] as const).map((valor) => (
          <Button key={valor} tamanho="sm" variante={filtro === valor ? "primario" : "secundario"} onClick={() => setFiltro(valor)}>
            {valor === "TODAS" ? "Todas" : ROTULO_STATUS[valor]}
          </Button>
        ))}
      </div>

      {!indicacoes && (
        <div className="mt-4 flex flex-col gap-3">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-20" />
          ))}
        </div>
      )}

      {indicacoes && indicacoes.length === 0 && (
        <EmptyState className="mt-6" titulo="Nenhuma indicação por aqui ainda." descricao="Registre a primeira indicação de cliente." />
      )}

      {indicacoes && indicacoes.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {indicacoes.map((indicacao) => (
            <li key={indicacao.id}>
              <Card className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink-900">
                        {indicacao.indicadorNome} → {indicacao.indicadoNome}
                      </p>
                      <Badge className={COR_STATUS[indicacao.status]}>{ROTULO_STATUS[indicacao.status]}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(indicacao.criadoEm))}
                      {indicacao.codigoVoucher ? ` · voucher ${indicacao.codigoVoucher}` : ""}
                      {indicacao.valorRecompensa ? ` · ${formatoMoeda.format(Number(indicacao.valorRecompensa))}` : ""}
                      {indicacao.pontuacao ? ` · ${indicacao.pontuacao} pts` : ""}
                      {indicacao.vendaConvertida ? ` · venda #${indicacao.vendaConvertida.numero}` : ""}
                    </p>
                    {indicacao.observacoes && <p className="mt-1 text-xs text-ink-500">{indicacao.observacoes}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {indicacao.indicadoWhatsapp && (
                      <a href={montarLinkChat(indicacao.indicadoWhatsapp)} target="_blank" rel="noopener noreferrer">
                        <Button tamanho="sm" variante="secundario" type="button">
                          WhatsApp do indicado
                        </Button>
                      </a>
                    )}
                    {indicacao.indicadoInstagram && (
                      <a href={linkInstagram(indicacao.indicadoInstagram)} target="_blank" rel="noopener noreferrer">
                        <Button tamanho="sm" variante="secundario" type="button">
                          Instagram
                        </Button>
                      </a>
                    )}
                    {indicacao.status === "PENDENTE" && (
                      <>
                        <Button tamanho="sm" onClick={() => abrirConversao(indicacao)}>
                          Converter em venda
                        </Button>
                        <Button tamanho="sm" variante="perigo" onClick={() => setIndicacaoParaCancelar(indicacao)}>
                          Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal titulo="Nova indicação" aberto={modalAberto} aoFechar={() => setModalAberto(false)}>
        <form className="flex flex-col gap-4" onSubmit={salvarIndicacao} noValidate>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Quem indicou</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                rotulo="Alguém da equipe (opcional)"
                value={form.indicadorUsuarioId ?? ""}
                onChange={(e) => selecionarIndicadorUsuario(e.target.value)}
              >
                <option value="">Pessoa de fora (parceiro, influenciador, cliente)</option>
                {equipe.map((membro) => (
                  <option key={membro.id} value={membro.id}>
                    {membro.nome}
                  </option>
                ))}
              </Select>
              <Input
                rotulo="Nome de quem indicou"
                required
                value={form.indicadorNome}
                onChange={(e) => setForm((atual) => ({ ...atual, indicadorNome: e.target.value }))}
              />
              <Input
                rotulo="WhatsApp de quem indicou"
                value={form.indicadorWhatsapp ?? ""}
                onChange={(e) => setForm((atual) => ({ ...atual, indicadorWhatsapp: e.target.value }))}
              />
              <Input
                rotulo="Instagram de quem indicou"
                placeholder="@usuario ou link"
                value={form.indicadorInstagram ?? ""}
                onChange={(e) => setForm((atual) => ({ ...atual, indicadorInstagram: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Cliente indicado</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select rotulo="Já é um cliente cadastrado? (opcional)" value={form.clienteId ?? ""} onChange={(e) => selecionarClienteIndicado(e.target.value)}>
                <option value="">Ainda não está no cadastro</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </Select>
              <Input
                rotulo="Nome do indicado"
                required
                value={form.indicadoNome}
                onChange={(e) => setForm((atual) => ({ ...atual, indicadoNome: e.target.value }))}
              />
              <Input
                rotulo="WhatsApp do indicado"
                value={form.indicadoWhatsapp ?? ""}
                onChange={(e) => setForm((atual) => ({ ...atual, indicadoWhatsapp: e.target.value }))}
              />
              <Input
                rotulo="Instagram do indicado"
                placeholder="@usuario ou link"
                value={form.indicadoInstagram ?? ""}
                onChange={(e) => setForm((atual) => ({ ...atual, indicadoInstagram: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Recompensa (opcional)</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                rotulo="Voucher/código"
                value={form.codigoVoucher ?? ""}
                onChange={(e) => setForm((atual) => ({ ...atual, codigoVoucher: e.target.value }))}
              />
              <Input
                rotulo="Valor (R$)"
                type="number"
                min="0"
                step="0.01"
                value={form.valorRecompensa ?? ""}
                onChange={(e) => setForm((atual) => ({ ...atual, valorRecompensa: e.target.value === "" ? undefined : Number(e.target.value) }))}
              />
              <Input
                rotulo="Pontos"
                type="number"
                min="0"
                step="1"
                value={form.pontuacao ?? ""}
                onChange={(e) => setForm((atual) => ({ ...atual, pontuacao: e.target.value === "" ? undefined : Number(e.target.value) }))}
              />
            </div>
          </div>

          <Input
            rotulo="Observações"
            value={form.observacoes ?? ""}
            onChange={(e) => setForm((atual) => ({ ...atual, observacoes: e.target.value }))}
          />

          <div className="flex justify-end gap-3 border-t border-ink-100 pt-4">
            <Button type="button" variante="secundario" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" carregando={salvando}>
              Registrar indicação
            </Button>
          </div>
        </form>
      </Modal>

      <Modal titulo="Converter em venda" aberto={indicacaoParaConverter !== null} aoFechar={() => setIndicacaoParaConverter(null)}>
        {indicacaoParaConverter && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-600">
              Selecione a venda que veio da indicação de <b>{indicacaoParaConverter.indicadoNome}</b>.
            </p>
            {vendas.length === 0 ? (
              <p className="text-sm text-ink-500">
                Nenhuma venda encontrada{indicacaoParaConverter.clienteId ? " para este cliente" : ""}. Registre a venda primeiro.
              </p>
            ) : (
              <Select rotulo="Venda" value={vendaEscolhidaId} onChange={(e) => setVendaEscolhidaId(e.target.value)}>
                <option value="">Selecione…</option>
                {vendas.map((venda) => (
                  <option key={venda.id} value={venda.id}>
                    #{venda.numero} — {venda.cliente?.nome ?? "sem cliente"} — {formatoMoeda.format(Number(venda.total))}
                  </option>
                ))}
              </Select>
            )}
            <div className="flex justify-end gap-3 border-t border-ink-100 pt-4">
              <Button type="button" variante="secundario" onClick={() => setIndicacaoParaConverter(null)}>
                Fechar
              </Button>
              <Button type="button" carregando={convertendo} disabled={!vendaEscolhidaId} onClick={confirmarConversao}>
                Confirmar conversão
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        titulo="Cancelar indicação"
        mensagem={`Cancelar a indicação de "${indicacaoParaCancelar?.indicadoNome ?? ""}"? Essa ação não pode ser desfeita.`}
        aberto={indicacaoParaCancelar !== null}
        confirmando={cancelando}
        aoConfirmar={confirmarCancelamento}
        aoCancelar={() => setIndicacaoParaCancelar(null)}
        rotuloConfirmar="Cancelar indicação"
      />
    </AppLayout>
  );
}
