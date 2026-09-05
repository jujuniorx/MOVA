import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { useModulos } from "../context/ModulosContext";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Alert } from "../components/ui/Alert";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { PageHeader } from "../components/ui/PageHeader";
import { Modal } from "../components/ui/Modal";
import { Badge } from "../components/ui/Badge";
import { cn } from "../lib/cn";
import {
  ApiError,
  clientesApi,
  devolucoesApi,
  estoqueApi,
  pedidosApi,
  produtosApi,
  vendasApi,
} from "../lib/api";
import type {
  Cliente,
  Devolucao,
  ItemEstoque,
  LocalEstoque,
  Pedido,
  Produto,
  ResultadoConferencia,
  StatusDevolucao,
  StatusPedido,
  StatusVenda,
  TipoMovimentacaoEstoque,
  Venda,
} from "../lib/api";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

type Aba = "estoque" | "vendas" | "pedidos" | "devolucoes";

// "devolucoes" não tem módulo próprio — só faz sentido junto de "vendas"
// (devolver algo que nunca foi vendido não existe), então segue o mesmo
// módulo dela.
const ABAS: { valor: Aba; rotulo: string; modulo: string }[] = [
  { valor: "estoque", rotulo: "Estoque", modulo: "estoque" },
  { valor: "vendas", rotulo: "Vendas", modulo: "vendas" },
  { valor: "pedidos", rotulo: "Pedidos", modulo: "pedidos" },
  { valor: "devolucoes", rotulo: "Devoluções", modulo: "vendas" },
];

export function OperacoesPage() {
  const { moduloAtivo, carregando: carregandoModulos } = useModulos();
  const [searchParams, setSearchParams] = useSearchParams();

  const abasDisponiveis = useMemo(() => ABAS.filter((a) => moduloAtivo(a.modulo)), [moduloAtivo]);

  const abaParam = searchParams.get("aba") as Aba | null;
  const abaValida = abaParam && abasDisponiveis.some((a) => a.valor === abaParam) ? abaParam : (abasDisponiveis[0]?.valor ?? null);
  const [aba, setAba] = useState<Aba | null>(abaValida);

  // Se a aba veio da URL apontando para um módulo desativado (acesso direto
  // à URL, ou módulo desativado depois do link ser salvo), corrige tanto o
  // estado quanto a URL para a primeira aba realmente disponível — nunca
  // deixa a tela travada numa aba que a empresa não tem mais.
  useEffect(() => {
    if (carregandoModulos) return;
    if (abaValida !== aba) setAba(abaValida);
    if (abaParam && abaParam !== abaValida) {
      setSearchParams(
        (atual) => {
          const novo = new URLSearchParams(atual);
          if (abaValida) novo.set("aba", abaValida);
          else novo.delete("aba");
          return novo;
        },
        { replace: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregandoModulos, abaValida]);

  function trocarAba(novaAba: Aba) {
    setAba(novaAba);
    setSearchParams((atual) => {
      const novo = new URLSearchParams(atual);
      novo.set("aba", novaAba);
      return novo;
    });
  }

  // O subtítulo só cita as áreas realmente disponíveis para esta empresa —
  // uma empresa de serviços que desativou Estoque não deveria ver "Estoque"
  // descrito aqui logo acima de uma navegação onde ele nem aparece.
  const subtituloOperacoes = abasDisponiveis.length > 0
    ? `${abasDisponiveis.map((a) => a.rotulo).join(", ")} em um só lugar.`
    : "Ative um recurso em Configurações para começar a usar esta área.";

  return (
    <AppLayout>
      <PageHeader titulo="Operações" subtitulo={subtituloOperacoes} />

      {!carregandoModulos && abasDisponiveis.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            titulo="Nenhum recurso de operações ativado"
            descricao='Ative Estoque, Vendas ou Pedidos em Configurações → Recursos do MOVA para usar esta área.'
          />
        </div>
      ) : (
        <>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {abasDisponiveis.map((item) => (
              <button
                key={item.valor}
                type="button"
                onClick={() => trocarAba(item.valor)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  aba === item.valor ? "bg-brand-600 text-white" : "border border-ink-200 bg-surface text-ink-600 hover:bg-ink-50"
                )}
              >
                {item.rotulo}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {aba === "estoque" && <AbaEstoque />}
            {aba === "vendas" && <AbaVendas />}
            {aba === "pedidos" && <AbaPedidos />}
            {aba === "devolucoes" && <AbaDevolucoes />}
          </div>
        </>
      )}
    </AppLayout>
  );
}

// --------------------------------------------------------------------------
// ESTOQUE
// --------------------------------------------------------------------------

function AbaEstoque() {
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [locais, setLocais] = useState<LocalEstoque[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  function carregar() {
    setCarregando(true);
    setErro(null);
    Promise.all([estoqueApi.listar(), estoqueApi.listarLocais(), produtosApi.listar(true)])
      .then(([itensResp, locaisResp, produtosResp]) => {
        setItens(itensResp);
        setLocais(locaisResp);
        setProdutos(produtosResp.filter((p) => p.controlaEstoque && p.tipoProduto === "SIMPLES"));
      })
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar o estoque."))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  const statusInfo: Record<ItemEstoque["status"], { rotulo: string; className: string }> = {
    SEM_ESTOQUE: { rotulo: "Sem estoque", className: "bg-danger-100 text-danger-700" },
    BAIXO: { rotulo: "Estoque baixo", className: "bg-warning-100 text-warning-700" },
    NORMAL: { rotulo: "Normal", className: "bg-success-100 text-success-700" },
    NAO_CONTROLADO: { rotulo: "Não controlado", className: "bg-ink-100 text-ink-600" },
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setModalAberto(true)} disabled={produtos.length === 0}>
          Nova movimentação
        </Button>
      </div>

      {erro && <Alert tipo="erro">{erro}</Alert>}

      {carregando && <Skeleton className="h-40" />}

      {!carregando && itens.length === 0 && !erro && (
        <EmptyState
          titulo="Nenhum produto com controle de estoque ainda."
          descricao='Ative "Controla estoque" ao cadastrar ou editar um produto para ele aparecer aqui.'
        />
      )}

      {!carregando && itens.length > 0 && (
        <ul className="flex flex-col gap-3 motion-safe:animate-fade-in-up">
          {itens.map((item) => (
            <li key={item.produtoId}>
              <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-ink-900">{item.nome}</p>
                    <Badge className={statusInfo[item.status].className}>{statusInfo[item.status].rotulo}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-500">
                    SKU: {item.sku ?? "—"} · Mínimo: {item.estoqueMinimo ?? "—"}
                  </p>
                  {item.status === "BAIXO" && item.estoqueMinimo !== null && (
                    <p className="mt-1 text-xs text-warning-600">
                      Você possui {item.totalDisponivel} unidades. O mínimo configurado é {item.estoqueMinimo}.
                    </p>
                  )}
                  {item.variacoes.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {item.variacoes.map((v) => (
                        <li key={v.id} className="text-xs text-ink-500">
                          {v.nome}: <span className="font-medium text-ink-700">{v.totalDisponivel}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex shrink-0 gap-6">
                  <div className="text-right">
                    <p className="text-xs text-ink-500">Disponível</p>
                    <p className="text-lg font-semibold text-ink-900">{item.totalDisponivel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink-500">Quarentena</p>
                    <p className="text-lg font-semibold text-ink-900">{item.totalQuarentena}</p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ModalMovimentacao
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
        aoSalvar={() => {
          setModalAberto(false);
          carregar();
        }}
        produtos={produtos}
        locais={locais}
      />
    </div>
  );
}

function ModalMovimentacao({
  aberto,
  aoFechar,
  aoSalvar,
  produtos,
  locais,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoSalvar: () => void;
  produtos: Produto[];
  locais: LocalEstoque[];
}) {
  const [produtoId, setProdutoId] = useState("");
  const [variacaoId, setVariacaoId] = useState("");
  const [localId, setLocalId] = useState("");
  const [localOrigemId, setLocalOrigemId] = useState("");
  const [tipo, setTipo] = useState<TipoMovimentacaoEstoque>("ENTRADA");
  const [quantidade, setQuantidade] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setProdutoId(produtos[0]?.id ?? "");
      setVariacaoId("");
      setLocalId(locais[0]?.id ?? "");
      setLocalOrigemId("");
      setTipo("ENTRADA");
      setQuantidade("");
      setMotivo("");
      setErro(null);
    }
  }, [aberto, produtos, locais]);

  const variacoesDoProduto = produtos.find((p) => p.id === produtoId)?.variacoes.filter((v) => v.ativa) ?? [];

  async function salvar() {
    setErro(null);
    const qtd = Number(quantidade);
    if (!produtoId || !localId || !qtd || qtd <= 0) {
      setErro("Selecione o produto, o local e informe uma quantidade válida.");
      return;
    }
    if (tipo === "TRANSFERENCIA" && (!localOrigemId || localOrigemId === localId)) {
      setErro("Para transferência, selecione um local de origem diferente do destino.");
      return;
    }
    setEnviando(true);
    try {
      await estoqueApi.movimentar({
        produtoId,
        variacaoId: variacaoId || undefined,
        localId,
        localOrigemId: tipo === "TRANSFERENCIA" ? localOrigemId : undefined,
        tipo,
        quantidade: qtd,
        motivo: motivo || undefined,
      });
      aoSalvar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível registrar a movimentação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Nova movimentação de estoque" aberto={aberto} aoFechar={aoFechar}>
      <div className="flex flex-col gap-4">
        {erro && <Alert tipo="erro">{erro}</Alert>}

        <Select
          rotulo="Produto"
          value={produtoId}
          onChange={(e) => {
            setProdutoId(e.target.value);
            setVariacaoId("");
          }}
          required
        >
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Select>

        {variacoesDoProduto.length > 0 && (
          <Select rotulo="Variação" value={variacaoId} onChange={(e) => setVariacaoId(e.target.value)}>
            <option value="">Sem variação (estoque geral do produto)</option>
            {variacoesDoProduto.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </Select>
        )}

        <Select rotulo="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimentacaoEstoque)} required>
          <option value="ENTRADA">Entrada</option>
          <option value="SAIDA">Saída</option>
          <option value="AJUSTE">Ajuste</option>
          <option value="TRANSFERENCIA">Transferência entre locais</option>
        </Select>

        {tipo === "TRANSFERENCIA" && (
          <Select rotulo="Local de origem" value={localOrigemId} onChange={(e) => setLocalOrigemId(e.target.value)} required>
            <option value="">Selecione...</option>
            {locais.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </Select>
        )}

        <Select rotulo={tipo === "TRANSFERENCIA" ? "Local de destino" : "Local"} value={localId} onChange={(e) => setLocalId(e.target.value)} required>
          {locais.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nome}
            </option>
          ))}
        </Select>

        <Input
          rotulo={tipo === "AJUSTE" ? "Quantidade (use negativo para reduzir)" : "Quantidade"}
          type="number"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          required
        />

        <Input rotulo="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />

        <Button onClick={salvar} carregando={enviando} className="mt-2 w-full">
          Registrar movimentação
        </Button>
      </div>
    </Modal>
  );
}

// --------------------------------------------------------------------------
// VENDAS
// --------------------------------------------------------------------------

function AbaVendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  function carregar() {
    setCarregando(true);
    setErro(null);
    Promise.all([vendasApi.listar(), produtosApi.listar(true), clientesApi.listar()])
      .then(([v, p, c]) => {
        setVendas(v);
        setProdutos(p);
        setClientes(c);
      })
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar as vendas."))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function cancelar(venda: Venda) {
    if (!confirm(`Cancelar a venda #${venda.numero}? O estoque debitado será estornado.`)) return;
    try {
      await vendasApi.cancelar(venda.id);
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível cancelar a venda.");
    }
  }

  const statusInfo: Record<StatusVenda, { rotulo: string; className: string }> = {
    CONFIRMADA: { rotulo: "Confirmada", className: "bg-success-100 text-success-700" },
    CANCELADA: { rotulo: "Cancelada", className: "bg-ink-100 text-ink-500" },
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setModalAberto(true)}>Nova venda</Button>
      </div>

      {erro && <Alert tipo="erro">{erro}</Alert>}
      {carregando && <Skeleton className="h-40" />}

      {!carregando && vendas.length === 0 && !erro && <EmptyState titulo="Nenhuma venda registrada ainda." />}

      {!carregando && vendas.length > 0 && (
        <ul className="flex flex-col gap-3">
          {vendas.map((venda) => (
            <li key={venda.id}>
              <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-900">Venda #{venda.numero}</p>
                    <Badge className={statusInfo[venda.status].className}>{statusInfo[venda.status].rotulo}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-500">
                    {venda.cliente?.nome ?? "Sem cliente"} · {formatoData.format(new Date(venda.criadoEm))} · {venda.origem}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-ink-900">{formatoMoeda.format(Number(venda.total))}</p>
                  {venda.status === "CONFIRMADA" && (
                    <Button tamanho="sm" variante="perigo" onClick={() => cancelar(venda)}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ModalNovaVenda
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
        aoSalvar={() => {
          setModalAberto(false);
          carregar();
        }}
        produtos={produtos}
        clientes={clientes}
      />
    </div>
  );
}

function ModalNovaVenda({
  aberto,
  aoFechar,
  aoSalvar,
  produtos,
  clientes,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoSalvar: () => void;
  produtos: Produto[];
  clientes: Cliente[];
}) {
  const [clienteId, setClienteId] = useState("");
  const [itens, setItens] = useState<{ produtoId: string; quantidade: string }[]>([{ produtoId: "", quantidade: "1" }]);
  const [desconto, setDesconto] = useState("0");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setClienteId("");
      setItens([{ produtoId: produtos[0]?.id ?? "", quantidade: "1" }]);
      setDesconto("0");
      setErro(null);
    }
  }, [aberto, produtos]);

  function atualizarItem(indice: number, campo: "produtoId" | "quantidade", valor: string) {
    setItens((atual) => atual.map((it, i) => (i === indice ? { ...it, [campo]: valor } : it)));
  }

  async function salvar() {
    setErro(null);
    const itensValidos = itens
      .filter((it) => it.produtoId && Number(it.quantidade) > 0)
      .map((it) => ({ produtoId: it.produtoId, quantidade: Number(it.quantidade) }));
    if (itensValidos.length === 0) {
      setErro("Adicione ao menos um item com quantidade válida.");
      return;
    }
    setEnviando(true);
    try {
      await vendasApi.criar({
        clienteId: clienteId || undefined,
        desconto: Number(desconto) || 0,
        itens: itensValidos,
      });
      aoSalvar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível registrar a venda.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Nova venda" aberto={aberto} aoFechar={aoFechar} tamanho="grande">
      <div className="flex flex-col gap-4">
        {erro && <Alert tipo="erro">{erro}</Alert>}

        <Select rotulo="Cliente (opcional)" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
          <option value="">Sem cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-ink-700">Itens</p>
          <ul className="flex flex-col gap-3">
            {itens.map((item, indice) => (
              <li key={indice} className="rounded-lg border border-ink-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <Select
                    rotulo="Produto"
                    className="flex-1"
                    value={item.produtoId}
                    onChange={(e) => atualizarItem(indice, "produtoId", e.target.value)}
                  >
                    <option value="">Selecione um produto...</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} — {formatoMoeda.format(Number(p.preco))}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    onClick={() => setItens((atual) => atual.filter((_, i) => i !== indice))}
                    aria-label="Remover item"
                    className="mt-6 shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-danger-600"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mt-3 w-32">
                  <Input rotulo="Quantidade" type="number" min={1} value={item.quantidade} onChange={(e) => atualizarItem(indice, "quantidade", e.target.value)} />
                </div>
              </li>
            ))}
          </ul>
          <Button
            tamanho="sm"
            variante="secundario"
            type="button"
            onClick={() => setItens((atual) => [...atual, { produtoId: "", quantidade: "1" }])}
            className="self-start"
          >
            + Adicionar item
          </Button>
        </div>

        <Input rotulo="Desconto (R$)" type="number" min={0} value={desconto} onChange={(e) => setDesconto(e.target.value)} />

        <Button onClick={salvar} carregando={enviando} className="mt-2 w-full">
          Registrar venda
        </Button>
      </div>
    </Modal>
  );
}

// --------------------------------------------------------------------------
// PEDIDOS
// --------------------------------------------------------------------------

function AbaPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  function carregar() {
    setCarregando(true);
    setErro(null);
    Promise.all([pedidosApi.listar(), produtosApi.listar(true)])
      .then(([pedidosResp, produtosResp]) => {
        setPedidos(pedidosResp);
        setProdutos(produtosResp);
      })
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar os pedidos."))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function atualizarStatus(pedido: Pedido, status: StatusPedido) {
    try {
      await pedidosApi.atualizarStatus(pedido.id, status);
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível atualizar o pedido.");
    }
  }

  const [convertendoId, setConvertendoId] = useState<string | null>(null);

  async function converterEmVenda(pedido: Pedido) {
    setErro(null);
    setConvertendoId(pedido.id);
    try {
      await vendasApi.criarAPartirDePedido(pedido.id);
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível converter o pedido em venda.");
    } finally {
      setConvertendoId(null);
    }
  }

  const statusInfo: Record<StatusPedido, { rotulo: string; className: string }> = {
    RECEBIDO: { rotulo: "Recebido", className: "bg-brand-100 text-brand-700" },
    PROCESSANDO: { rotulo: "Processando", className: "bg-warning-100 text-warning-700" },
    CONFIRMADO: { rotulo: "Confirmado", className: "bg-success-100 text-success-700" },
    CANCELADO: { rotulo: "Cancelado", className: "bg-ink-100 text-ink-500" },
  };

  return (
    <div className="flex flex-col gap-4">
      <Alert tipo="aviso">
        Pedidos do WhatsApp e Mercado Livre chegam automaticamente quando essas integrações estiverem conectadas.
        Por enquanto, registre pedidos manuais aqui.
      </Alert>

      <div className="flex justify-end">
        <Button onClick={() => setModalAberto(true)}>Novo pedido</Button>
      </div>

      {erro && <Alert tipo="erro">{erro}</Alert>}
      {carregando && <Skeleton className="h-40" />}
      {!carregando && pedidos.length === 0 && !erro && <EmptyState titulo="Nenhum pedido registrado ainda." />}

      {!carregando && pedidos.length > 0 && (
        <ul className="flex flex-col gap-3">
          {pedidos.map((pedido) => (
            <li key={pedido.id}>
              <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-900">Pedido #{pedido.numero}</p>
                    <Badge className={statusInfo[pedido.status].className}>{statusInfo[pedido.status].rotulo}</Badge>
                    <Badge className="bg-ink-100 text-ink-600">{pedido.canal}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-500">
                    {pedido.cliente?.nome ?? "Sem cliente"} · {formatoData.format(new Date(pedido.criadoEm))}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-ink-900">{formatoMoeda.format(Number(pedido.total))}</p>
                  {pedido.status !== "CANCELADO" && pedido.status !== "CONFIRMADO" && (
                    <Select
                      className="w-40"
                      value={pedido.status}
                      onChange={(e) => atualizarStatus(pedido, e.target.value as StatusPedido)}
                    >
                      <option value="RECEBIDO">Recebido</option>
                      <option value="PROCESSANDO">Processando</option>
                      <option value="CONFIRMADO">Confirmado</option>
                      <option value="CANCELADO">Cancelado</option>
                    </Select>
                  )}
                  {pedido.venda ? (
                    <Badge className="bg-success-100 text-success-700">Venda #{pedido.venda.numero}</Badge>
                  ) : (
                    pedido.status !== "CANCELADO" && (
                      <Button
                        tamanho="sm"
                        variante="secundario"
                        carregando={convertendoId === pedido.id}
                        onClick={() => converterEmVenda(pedido)}
                      >
                        Converter em venda
                      </Button>
                    )
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ModalNovoPedido
        aberto={modalAberto}
        produtos={produtos}
        aoFechar={() => setModalAberto(false)}
        aoSalvar={() => {
          setModalAberto(false);
          carregar();
        }}
      />
    </div>
  );
}

function ModalNovoPedido({
  aberto,
  produtos,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  produtos: Produto[];
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const [itens, setItens] = useState([{ produtoId: "", nome: "", quantidade: "1", precoUnitario: "0" }]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setItens([{ produtoId: "", nome: "", quantidade: "1", precoUnitario: "0" }]);
      setErro(null);
    }
  }, [aberto]);

  function atualizarItem(indice: number, campo: "produtoId" | "nome" | "quantidade" | "precoUnitario", valor: string) {
    setItens((atual) =>
      atual.map((it, i) => {
        if (i !== indice) return it;
        if (campo === "produtoId" && valor) {
          const produto = produtos.find((p) => p.id === valor);
          return { ...it, produtoId: valor, nome: produto?.nome ?? it.nome, precoUnitario: produto ? produto.preco : it.precoUnitario };
        }
        return { ...it, [campo]: valor };
      })
    );
  }

  async function salvar() {
    setErro(null);
    const itensValidos = itens
      .filter((it) => it.nome.trim() && Number(it.quantidade) > 0)
      .map((it) => ({
        nome: it.nome.trim(),
        quantidade: Number(it.quantidade),
        precoUnitario: Number(it.precoUnitario) || 0,
        produtoId: it.produtoId || undefined,
      }));
    if (itensValidos.length === 0) {
      setErro("Adicione ao menos um item válido.");
      return;
    }
    setEnviando(true);
    try {
      await pedidosApi.criar({ canal: "MANUAL", itens: itensValidos });
      aoSalvar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível registrar o pedido.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Novo pedido manual" aberto={aberto} aoFechar={aoFechar} tamanho="grande">
      <div className="flex flex-col gap-4">
        {erro && <Alert tipo="erro">{erro}</Alert>}
        <p className="text-xs text-ink-500">
          Ligar um item a um produto do catálogo é opcional, mas necessário para depois converter este pedido em venda com baixa de estoque.
        </p>
        <div className="flex flex-col gap-2">
          <ul className="flex flex-col gap-3">
            {itens.map((item, indice) => (
              <li key={indice} className="rounded-lg border border-ink-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  {produtos.length > 0 ? (
                    <Select
                      rotulo="Produto do catálogo (opcional)"
                      className="flex-1"
                      value={item.produtoId}
                      onChange={(e) => atualizarItem(indice, "produtoId", e.target.value)}
                    >
                      <option value="">Item avulso (sem produto)</option>
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </Select>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setItens((atual) => atual.filter((_, i) => i !== indice))}
                    aria-label="Remover item"
                    className="mt-6 shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-danger-600"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mt-3">
                  <Input
                    rotulo="Nome do item"
                    disabled={Boolean(item.produtoId)}
                    value={item.nome}
                    onChange={(e) => atualizarItem(indice, "nome", e.target.value)}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Input rotulo="Quantidade" type="number" min={1} value={item.quantidade} onChange={(e) => atualizarItem(indice, "quantidade", e.target.value)} />
                  <Input rotulo="Preço unit. (R$)" type="number" min={0} step="0.01" value={item.precoUnitario} onChange={(e) => atualizarItem(indice, "precoUnitario", e.target.value)} />
                </div>
              </li>
            ))}
          </ul>
          <Button
            tamanho="sm"
            variante="secundario"
            type="button"
            onClick={() => setItens((atual) => [...atual, { produtoId: "", nome: "", quantidade: "1", precoUnitario: "0" }])}
            className="self-start"
          >
            + Adicionar item
          </Button>
        </div>
        <Button onClick={salvar} carregando={enviando} className="mt-2 w-full">
          Registrar pedido
        </Button>
      </div>
    </Modal>
  );
}

// --------------------------------------------------------------------------
// DEVOLUÇÕES
// --------------------------------------------------------------------------

function AbaDevolucoes() {
  const [devolucoes, setDevolucoes] = useState<Devolucao[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  function carregar() {
    setCarregando(true);
    setErro(null);
    Promise.all([devolucoesApi.listar(), produtosApi.listar(true)])
      .then(([d, p]) => {
        setDevolucoes(d);
        setProdutos(p);
      })
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar as devoluções."))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function receber(devolucao: Devolucao) {
    try {
      await devolucoesApi.receber(devolucao.id);
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível registrar o recebimento.");
    }
  }

  async function conferir(devolucao: Devolucao, itemId: string, resultado: ResultadoConferencia) {
    try {
      await devolucoesApi.conferirItem(devolucao.id, itemId, resultado);
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível registrar a conferência.");
    }
  }

  const statusInfo: Record<StatusDevolucao, { rotulo: string; className: string }> = {
    IDENTIFICADA: { rotulo: "Identificada", className: "bg-ink-100 text-ink-600" },
    AGUARDANDO_RECEBIMENTO: { rotulo: "Aguardando recebimento", className: "bg-warning-100 text-warning-700" },
    RECEBIDA: { rotulo: "Recebida", className: "bg-brand-100 text-brand-700" },
    EM_CONFERENCIA: { rotulo: "Em conferência (quarentena)", className: "bg-warning-100 text-warning-700" },
    APROVADA: { rotulo: "Aprovada — liberada", className: "bg-success-100 text-success-700" },
    REPROVADA: { rotulo: "Reprovada", className: "bg-danger-100 text-danger-700" },
    SINCRONIZACAO_PENDENTE: { rotulo: "Sincronização pendente", className: "bg-warning-100 text-warning-700" },
    SINCRONIZADA: { rotulo: "Sincronizada", className: "bg-success-100 text-success-700" },
    ERRO_SINCRONIZACAO: { rotulo: "Erro de sincronização", className: "bg-danger-100 text-danger-700" },
  };

  return (
    <div className="flex flex-col gap-4">
      <Alert tipo="aviso">
        Produto devolvido nunca volta direto para o estoque disponível. Ele fica em quarentena até a conferência
        confirmar que está íntegro.
      </Alert>

      <div className="flex justify-end">
        <Button onClick={() => setModalAberto(true)}>Registrar devolução</Button>
      </div>

      {erro && <Alert tipo="erro">{erro}</Alert>}
      {carregando && <Skeleton className="h-40" />}
      {!carregando && devolucoes.length === 0 && !erro && <EmptyState titulo="Nenhuma devolução registrada." />}

      {!carregando &&
        devolucoes.map((devolucao) => (
          <Card key={devolucao.id} className="flex flex-col gap-3">
            <CardHeader
              titulo={
                <span className="flex items-center gap-2">
                  Devolução {devolucao.venda ? `— Venda #${devolucao.venda.numero}` : devolucao.pedido ? `— Pedido #${devolucao.pedido.numero}` : ""}
                  <Badge className={statusInfo[devolucao.status].className}>{statusInfo[devolucao.status].rotulo}</Badge>
                </span>
              }
              descricao={devolucao.observacoes ?? undefined}
              acao={
                (devolucao.status === "IDENTIFICADA" || devolucao.status === "AGUARDANDO_RECEBIMENTO") && (
                  <Button tamanho="sm" onClick={() => receber(devolucao)}>
                    Registrar recebimento (quarentena)
                  </Button>
                )
              }
            />
            <ul className="flex flex-col gap-2">
              {devolucao.itens.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm">
                  <span className="text-ink-700">
                    {item.produto?.nome ?? produtos.find((p) => p.id === item.produtoId)?.nome ?? "Produto"} · {item.quantidade} un.
                  </span>
                  {item.resultadoConferencia ? (
                    <Badge
                      className={
                        item.resultadoConferencia === "INTEGRO" ? "bg-success-100 text-success-700" : "bg-danger-100 text-danger-700"
                      }
                    >
                      {item.resultadoConferencia}
                    </Badge>
                  ) : (devolucao.status === "EM_CONFERENCIA" || devolucao.status === "RECEBIDA") ? (
                    <div className="flex gap-1.5">
                      <Button tamanho="sm" variante="sucesso" onClick={() => conferir(devolucao, item.id, "INTEGRO")}>
                        Íntegro
                      </Button>
                      <Button tamanho="sm" variante="perigo" onClick={() => conferir(devolucao, item.id, "AVARIA")}>
                        Avaria
                      </Button>
                      <Button tamanho="sm" variante="secundario" onClick={() => conferir(devolucao, item.id, "INCOMPLETO")}>
                        Incompleto
                      </Button>
                      <Button tamanho="sm" variante="secundario" onClick={() => conferir(devolucao, item.id, "DIVERGENTE")}>
                        Divergente
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-ink-400">Aguardando recebimento</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ))}

      <ModalNovaDevolucao
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
        aoSalvar={() => {
          setModalAberto(false);
          carregar();
        }}
        produtos={produtos}
      />
    </div>
  );
}

function ModalNovaDevolucao({
  aberto,
  aoFechar,
  aoSalvar,
  produtos,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoSalvar: () => void;
  produtos: Produto[];
}) {
  const [itens, setItens] = useState<{ produtoId: string; quantidade: string }[]>([{ produtoId: "", quantidade: "1" }]);
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setItens([{ produtoId: produtos[0]?.id ?? "", quantidade: "1" }]);
      setObservacoes("");
      setErro(null);
    }
  }, [aberto, produtos]);

  function atualizarItem(indice: number, campo: "produtoId" | "quantidade", valor: string) {
    setItens((atual) => atual.map((it, i) => (i === indice ? { ...it, [campo]: valor } : it)));
  }

  async function salvar() {
    setErro(null);
    const itensValidos = itens
      .filter((it) => it.produtoId && Number(it.quantidade) > 0)
      .map((it) => ({ produtoId: it.produtoId, quantidade: Number(it.quantidade) }));
    if (itensValidos.length === 0) {
      setErro("Adicione ao menos um item devolvido.");
      return;
    }
    setEnviando(true);
    try {
      await devolucoesApi.criar({ itens: itensValidos, observacoes: observacoes || undefined });
      aoSalvar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível registrar a devolução.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Registrar devolução" aberto={aberto} aoFechar={aoFechar} tamanho="grande">
      <div className="flex flex-col gap-4">
        {erro && <Alert tipo="erro">{erro}</Alert>}
        <div className="flex flex-col gap-2">
          <ul className="flex flex-col gap-3">
            {itens.map((item, indice) => (
              <li key={indice} className="rounded-lg border border-ink-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <Select rotulo="Produto" className="flex-1" value={item.produtoId} onChange={(e) => atualizarItem(indice, "produtoId", e.target.value)}>
                    <option value="">Selecione um produto...</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    onClick={() => setItens((atual) => atual.filter((_, i) => i !== indice))}
                    aria-label="Remover item"
                    className="mt-6 shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-danger-600"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mt-3 w-32">
                  <Input rotulo="Quantidade" type="number" min={1} value={item.quantidade} onChange={(e) => atualizarItem(indice, "quantidade", e.target.value)} />
                </div>
              </li>
            ))}
          </ul>
          <Button tamanho="sm" variante="secundario" type="button" onClick={() => setItens((atual) => [...atual, { produtoId: "", quantidade: "1" }])} className="self-start">
            + Adicionar item
          </Button>
        </div>
        <Input rotulo="Observações (opcional)" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        <Button onClick={salvar} carregando={enviando} className="mt-2 w-full">
          Registrar devolução
        </Button>
      </div>
    </Modal>
  );
}
