import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { ClienteFormModal } from "../components/clientes/ClienteFormModal";
import { ApiError, clientesApi, produtosApi, orcamentosApi } from "../lib/api";
import type { Cliente, Produto, CampoProduto, ValorCampoInput } from "../lib/api";
import { orcamentoFormSchema } from "../schemas/orcamento.schema";
import { useToast } from "../context/ToastContext";

type ValoresCampos = Record<string, string | string[]>;

interface LinhaItem {
  chave: string;
  produtoId: string;
  nome: string;
  quantidade: string;
  precoUnitario: string;
  valoresCampos: ValoresCampos;
}

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function calcularSubtotalItem(item: LinhaItem): number {
  const quantidade = Number(item.quantidade) || 0;
  const preco = Number(item.precoUnitario) || 0;
  return quantidade * preco;
}

function TituloSecao({
  numero,
  titulo,
  subtitulo,
  concluido = false,
}: {
  numero: number;
  titulo: string;
  subtitulo?: string;
  concluido?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
            concluido ? "bg-success-600 text-white" : "bg-orca-900 text-white"
          }`}
        >
          {concluido ? (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            numero
          )}
        </span>
        <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
      </div>
      {subtitulo && <p className="mt-1 pl-9 text-sm text-slate-500">{subtitulo}</p>}
    </div>
  );
}

function CampoItemInput({
  campo,
  valor,
  aoAlterarValor,
  aoAlternarOpcao,
}: {
  campo: CampoProduto;
  valor: string | string[] | undefined;
  aoAlterarValor: (valor: string) => void;
  aoAlternarOpcao: (opcaoId: string, marcado: boolean) => void;
}) {
  const rotulo = campo.obrigatorio ? `${campo.nome} *` : campo.nome;

  if (campo.tipo === "TEXTO") {
    return (
      <Input
        rotulo={rotulo}
        value={typeof valor === "string" ? valor : ""}
        onChange={(evento) => aoAlterarValor(evento.target.value)}
      />
    );
  }

  if (campo.tipo === "NUMERO") {
    return (
      <Input
        rotulo={campo.unidade ? `${rotulo} (${campo.unidade})` : rotulo}
        type="number"
        step="0.01"
        value={typeof valor === "string" ? valor : ""}
        onChange={(evento) => aoAlterarValor(evento.target.value)}
      />
    );
  }

  if (campo.tipo === "SELECAO_UNICA") {
    return (
      <div>
        <label className="text-sm font-medium text-slate-700">{rotulo}</label>
        <select
          value={typeof valor === "string" ? valor : ""}
          onChange={(evento) => aoAlterarValor(evento.target.value)}
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-facil-500 focus:border-facil-500"
        >
          <option value="">Selecione...</option>
          {campo.opcoes.map((opcao) => (
            <option key={opcao.id} value={opcao.id}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const selecionados = Array.isArray(valor) ? valor : [];
  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{rotulo}</p>
      <div className="mt-1.5 flex flex-col gap-1.5">
        {campo.opcoes.map((opcao) => (
          <label key={opcao.id} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={selecionados.includes(opcao.id)}
              onChange={(evento) => aoAlternarOpcao(opcao.id, evento.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-facil-600 focus:ring-facil-500"
            />
            {opcao.rotulo}
          </label>
        ))}
      </div>
    </div>
  );
}

export function NovoOrcamentoPage() {
  const navigate = useNavigate();
  const { mostrarSucesso } = useToast();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  const [clienteId, setClienteId] = useState("");
  const [clienteModalAberto, setClienteModalAberto] = useState(false);

  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState("");
  const [itens, setItens] = useState<LinhaItem[]>([]);

  const [desconto, setDesconto] = useState("0");
  const [observacoes, setObservacoes] = useState("");
  const [validade, setValidade] = useState("");

  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setCarregandoDados(true);
    Promise.all([clientesApi.listar(), produtosApi.listar(true)])
      .then(([listaClientes, listaProdutos]) => {
        setClientes(listaClientes);
        setProdutos(listaProdutos);
      })
      .catch((erro) =>
        setErroCarregamento(
          erro instanceof ApiError ? erro.message : "Não foi possível carregar os dados necessários."
        )
      )
      .finally(() => setCarregandoDados(false));
  }, []);

  function produtoDoItem(produtoId: string): Produto | undefined {
    return produtos.find((produto) => produto.id === produtoId);
  }

  function adicionarItem() {
    const produto = produtoDoItem(produtoSelecionadoId);
    if (!produto) return;

    setItens((atual) => [
      ...atual,
      {
        chave: crypto.randomUUID(),
        produtoId: produto.id,
        nome: produto.nome,
        quantidade: "1",
        precoUnitario: produto.preco,
        valoresCampos: {},
      },
    ]);
    setProdutoSelecionadoId("");
  }

  function removerItem(chave: string) {
    setItens((atual) => atual.filter((item) => item.chave !== chave));
  }

  function atualizarItem(chave: string, campo: "quantidade" | "precoUnitario", valor: string) {
    setItens((atual) =>
      atual.map((item) => (item.chave === chave ? { ...item, [campo]: valor } : item))
    );
  }

  function atualizarValorCampo(itemChave: string, campoId: string, valor: string) {
    setItens((atual) =>
      atual.map((item) =>
        item.chave === itemChave
          ? { ...item, valoresCampos: { ...item.valoresCampos, [campoId]: valor } }
          : item
      )
    );
  }

  function alternarOpcaoMultipla(itemChave: string, campoId: string, opcaoId: string, marcado: boolean) {
    setItens((atual) =>
      atual.map((item) => {
        if (item.chave !== itemChave) return item;
        const atualArray = Array.isArray(item.valoresCampos[campoId])
          ? (item.valoresCampos[campoId] as string[])
          : [];
        const novoArray = marcado
          ? [...atualArray, opcaoId]
          : atualArray.filter((id) => id !== opcaoId);
        return { ...item, valoresCampos: { ...item.valoresCampos, [campoId]: novoArray } };
      })
    );
  }

  function aoSalvarClienteNovo(cliente: Cliente) {
    setClientes((atual) => {
      const semODuplicado = atual.filter((item) => item.id !== cliente.id);
      return [...semODuplicado, cliente].sort((a, b) => a.nome.localeCompare(b.nome));
    });
    setClienteId(cliente.id);
    setClienteModalAberto(false);
  }

  const subtotalPreview = itens.reduce((soma, item) => soma + calcularSubtotalItem(item), 0);
  const descontoPreview = Number(desconto) || 0;
  const totalPreview = Math.max(subtotalPreview - descontoPreview, 0);

  function validarCamposObrigatorios(): string | null {
    for (const item of itens) {
      const produto = produtoDoItem(item.produtoId);
      if (!produto) continue;

      for (const campo of produto.campos) {
        if (!campo.obrigatorio) continue;
        const valor = item.valoresCampos[campo.id];
        const vazio =
          valor === undefined || (typeof valor === "string" ? valor.trim() === "" : valor.length === 0);
        if (vazio) {
          return `Preencha o campo "${campo.nome}" de "${produto.nome}".`;
        }
      }
    }
    return null;
  }

  function montarValoresCamposParaEnvio(item: LinhaItem): ValorCampoInput[] {
    const produto = produtoDoItem(item.produtoId);
    if (!produto || produto.campos.length === 0) return [];

    const valores: ValorCampoInput[] = [];
    for (const campo of produto.campos) {
      const valor = item.valoresCampos[campo.id];
      if (valor === undefined) continue;
      if (typeof valor === "string" && valor.trim() === "") continue;
      if (Array.isArray(valor) && valor.length === 0) continue;
      valores.push({ campoId: campo.id, valor });
    }
    return valores;
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErroGeral(null);

    const erroObrigatorio = validarCamposObrigatorios();
    if (erroObrigatorio) {
      setErroGeral(erroObrigatorio);
      return;
    }

    const resultado = orcamentoFormSchema.safeParse({
      clienteId,
      validade,
      observacoes,
      desconto: Number(desconto) || 0,
      itens: itens.map((item) => ({
        produtoId: item.produtoId,
        quantidade: Number(item.quantidade),
        precoUnitario: Number(item.precoUnitario),
        valoresCampos: montarValoresCamposParaEnvio(item),
      })),
    });

    if (!resultado.success) {
      const primeiraIssue = resultado.error.issues[0];
      const campoRaiz = String(primeiraIssue.path[0]);
      const camposComErroInline = ["clienteId", "desconto", "observacoes", "validade"];
      if (camposComErroInline.includes(campoRaiz)) {
        setErros({ [campoRaiz]: primeiraIssue.message });
      } else {
        setErroGeral(primeiraIssue.message);
      }
      return;
    }
    setErros({});

    setEnviando(true);
    try {
      const orcamentoCriado = await orcamentosApi.criar({
        clienteId: resultado.data.clienteId,
        validade: resultado.data.validade,
        observacoes: resultado.data.observacoes,
        desconto: resultado.data.desconto,
        itens: resultado.data.itens,
      });
      mostrarSucesso("✓ Orçamento criado");
      navigate(`/orcamentos/${orcamentoCriado.id}`);
    } catch (erro) {
      setErroGeral(
        erro instanceof ApiError ? erro.message : "Não foi possível salvar o orçamento. Tente novamente."
      );
    } finally {
      setEnviando(false);
    }
  }

  if (carregandoDados) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((chave) => (
            <Card key={chave} className="h-20 animate-pulse bg-slate-100" />
          ))}
        </div>
      </AppLayout>
    );
  }

  if (erroCarregamento) {
    return (
      <AppLayout>
        <Alert tipo="erro">{erroCarregamento}</Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-900">Novo orçamento</h1>
      <p className="mt-1 text-sm text-slate-500">
        Selecione o cliente, adicione os itens e revise os valores antes de salvar.
      </p>

      <form className="mt-6 flex flex-col gap-6" onSubmit={aoEnviar} noValidate>
        {erroGeral && <Alert tipo="erro">{erroGeral}</Alert>}

        <Card>
          <TituloSecao
            numero={1}
            titulo="Cliente"
            subtitulo="Escolha para quem é este orçamento."
            concluido={Boolean(clienteId)}
          />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="cliente-select">
                Cliente <span className="text-danger-600">*</span>
              </label>
              <select
                id="cliente-select"
                value={clienteId}
                onChange={(evento) => setClienteId(evento.target.value)}
                className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-facil-500 focus:border-facil-500 ${
                  erros.clienteId ? "border-danger-600" : "border-slate-300"
                }`}
              >
                <option value="">Selecione um cliente...</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
              {erros.clienteId && <p className="mt-1 text-sm text-danger-600">{erros.clienteId}</p>}
            </div>
            <Button type="button" variante="secundario" onClick={() => setClienteModalAberto(true)}>
              + Novo cliente
            </Button>
          </div>
          {clientes.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">
              Você ainda não tem clientes cadastrados. Use o botão "+ Novo cliente" acima para
              cadastrar quem vai receber este orçamento.
            </p>
          )}
        </Card>

        <Card>
          <TituloSecao
            numero={2}
            titulo="Itens do orçamento"
            subtitulo="Adicione o que você vai vender e preencha as informações que pedimos para calcular certinho."
            concluido={itens.length > 0}
          />

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="produto-select">
                Produto/serviço
              </label>
              <select
                id="produto-select"
                value={produtoSelecionadoId}
                onChange={(evento) => setProdutoSelecionadoId(evento.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-facil-500 focus:border-facil-500"
              >
                <option value="">Selecione um produto ou serviço...</option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome} — {formatoMoeda.format(Number(produto.preco))}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" variante="secundario" onClick={adicionarItem} disabled={!produtoSelecionadoId}>
              Adicionar item
            </Button>
          </div>

          {produtos.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">
              Você ainda não cadastrou nenhum produto ou serviço.{" "}
              <Link to="/produtos?novo=1" className="font-medium text-facil-600 hover:underline">
                Cadastrar agora
              </Link>
            </p>
          )}

          {itens.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Nenhum item adicionado ainda.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {itens.map((item) => {
                const produto = produtoDoItem(item.produtoId);
                const campos = produto?.campos ?? [];

                return (
                  <li
                    key={item.chave}
                    className="rounded-lg border border-slate-200 p-3 transition-colors hover:border-slate-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-slate-900">{item.nome}</p>
                      <button
                        type="button"
                        onClick={() => removerItem(item.chave)}
                        aria-label={`Remover ${item.nome}`}
                        className="shrink-0 text-slate-400 hover:text-danger-600"
                      >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <Input
                        rotulo="Quantidade"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantidade}
                        onChange={(evento) => atualizarItem(item.chave, "quantidade", evento.target.value)}
                      />
                      <Input
                        rotulo="Preço unitário (R$)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.precoUnitario}
                        onChange={(evento) => atualizarItem(item.chave, "precoUnitario", evento.target.value)}
                      />
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-sm font-medium text-slate-700">Subtotal</p>
                        <p className="mt-1.5 py-2.5 text-sm font-semibold text-slate-900">
                          {formatoMoeda.format(calcularSubtotalItem(item))}
                        </p>
                      </div>
                    </div>

                    {campos.length > 0 && (
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <p className="text-sm text-slate-600">
                          Agora precisamos de algumas informações sobre este item.
                        </p>
                        <div className="mt-3 flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
                        {campos.map((campo) => (
                          <CampoItemInput
                            key={campo.id}
                            campo={campo}
                            valor={item.valoresCampos[campo.id]}
                            aoAlterarValor={(valor) => atualizarValorCampo(item.chave, campo.id, valor)}
                            aoAlternarOpcao={(opcaoId, marcado) =>
                              alternarOpcaoMultipla(item.chave, campo.id, opcaoId, marcado)
                            }
                          />
                        ))}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <TituloSecao
            numero={3}
            titulo="Resumo e condições"
            subtitulo="Confira o valor final antes de criar o orçamento."
          />

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              rotulo="Desconto (R$)"
              type="number"
              min="0"
              step="0.01"
              value={desconto}
              onChange={(evento) => setDesconto(evento.target.value)}
              erro={erros.desconto}
            />
            <Input
              rotulo="Validade"
              type="date"
              value={validade}
              onChange={(evento) => setValidade(evento.target.value)}
              erro={erros.validade}
            />
          </div>

          <div className="mt-4">
            <Input
              rotulo="Observações"
              value={observacoes}
              onChange={(evento) => setObservacoes(evento.target.value)}
              erro={erros.observacoes}
            />
          </div>

          <div className="mt-6 rounded-lg bg-slate-50 p-4">
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatoMoeda.format(subtotalPreview)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Desconto</span>
                <span>{formatoMoeda.format(descontoPreview)}</span>
              </div>
              <div className="mt-1.5 flex justify-between border-t border-slate-200 pt-2 text-lg font-bold text-slate-900">
                <span>Total</span>
                <span>{formatoMoeda.format(totalPreview)}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variante="secundario" onClick={() => navigate("/painel")} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" carregando={enviando}>
            Criar orçamento
          </Button>
        </div>
      </form>

      <ClienteFormModal
        aberto={clienteModalAberto}
        clienteEmEdicao={null}
        aoFechar={() => setClienteModalAberto(false)}
        aoSalvar={aoSalvarClienteNovo}
      />
    </AppLayout>
  );
}
