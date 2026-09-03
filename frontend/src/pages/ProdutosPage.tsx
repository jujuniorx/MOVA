import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ProdutoFormModal } from "../components/produtos/ProdutoFormModal";
import { ApiError, produtosApi } from "../lib/api";
import type { Produto } from "../lib/api";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Filtro = "todos" | "ativos" | "inativos";

const filtros: { rotulo: string; valor: Filtro }[] = [
  { rotulo: "Todos", valor: "todos" },
  { rotulo: "Ativos", valor: "ativos" },
  { rotulo: "Inativos", valor: "inativos" },
];

function filtroParaAtivo(filtro: Filtro): boolean | undefined {
  if (filtro === "ativos") return true;
  if (filtro === "inativos") return false;
  return undefined;
}

function IconeProduto() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orca-900/10 text-orca-900">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    </span>
  );
}

export function ProdutosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null);

  const [produtoParaExcluir, setProdutoParaExcluir] = useState<Produto | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  function carregarProdutos() {
    setCarregando(true);
    setErro(null);
    produtosApi
      .listar(filtroParaAtivo(filtro))
      .then(setProdutos)
      .catch((erroCapturado) =>
        setErro(
          erroCapturado instanceof ApiError ? erroCapturado.message : "Não foi possível carregar os produtos."
        )
      )
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregarProdutos();
  }, [filtro]);

  function abrirNovoProduto() {
    setProdutoEmEdicao(null);
    setModalAberto(true);
  }

  useEffect(() => {
    if (searchParams.get("novo") === "1") {
      abrirNovoProduto();
      setSearchParams((atual) => {
        const novo = new URLSearchParams(atual);
        novo.delete("novo");
        return novo;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirEdicao(produto: Produto) {
    setProdutoEmEdicao(produto);
    setModalAberto(true);
  }

  function aoSalvarProduto() {
    setModalAberto(false);
    carregarProdutos();
  }

  async function alternarAtivo(produto: Produto) {
    try {
      await produtosApi.atualizar(produto.id, { ativo: !produto.ativo });
      carregarProdutos();
    } catch (erroCapturado) {
      setErro(
        erroCapturado instanceof ApiError ? erroCapturado.message : "Não foi possível atualizar o produto."
      );
    }
  }

  async function confirmarExclusao() {
    if (!produtoParaExcluir) return;
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await produtosApi.excluir(produtoParaExcluir.id);
      setProdutoParaExcluir(null);
      carregarProdutos();
    } catch (erroCapturado) {
      setErroExclusao(
        erroCapturado instanceof ApiError ? erroCapturado.message : "Não foi possível excluir o produto."
      );
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Produtos e serviços
            {!carregando && (
              <span className="ml-2 text-sm font-normal text-slate-400">({produtos.length})</span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Esses itens aparecem na hora de montar um orçamento.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => abrirNovoProduto()}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novo produto
        </Button>
      </div>

      <div className="mt-4 rounded-lg bg-facil-50 px-4 py-2.5 text-sm text-facil-700">
        💡 Dica: você não precisa cadastrar todos os seus produtos agora. Comece pelo que mais
        vende.
      </div>

      <div className="mt-5 flex gap-2">
        {filtros.map((item) => (
          <button
            key={item.valor}
            type="button"
            onClick={() => setFiltro(item.valor)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              filtro === item.valor
                ? "bg-facil-600 text-white"
                : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            {item.rotulo}
          </button>
        ))}
      </div>

      {erro && (
        <div className="mt-6">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {carregando && (
        <div className="mt-6 flex flex-col gap-3">
          {[1, 2, 3].map((chave) => (
            <Card key={chave} className="h-20 animate-pulse bg-slate-100" />
          ))}
        </div>
      )}

      {!carregando && !erro && produtos.length === 0 && filtro === "todos" && (
        <Card className="mt-6 flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </span>
          <p className="text-sm text-slate-600">Você ainda não tem produtos ou serviços cadastrados.</p>
          <p className="max-w-sm text-sm text-slate-500">
            Cadastre o que sua empresa vende para começar.
          </p>
          <Button variante="secundario" onClick={abrirNovoProduto}>
            Cadastrar meu primeiro produto
          </Button>
        </Card>
      )}

      {!carregando && !erro && produtos.length === 0 && filtro !== "todos" && (
        <Card className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-slate-600">
            Nenhum produto {filtro === "ativos" ? "ativo" : "inativo"} no momento.
          </p>
          <button
            type="button"
            onClick={() => setFiltro("todos")}
            className="text-sm font-medium text-facil-600 hover:underline"
          >
            Ver todos os produtos
          </button>
        </Card>
      )}

      {!carregando && produtos.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3 motion-safe:animate-fade-in-up">
          {produtos.map((produto) => (
            <li key={produto.id}>
              <Card className="flex flex-col gap-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <IconeProduto />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">{produto.nome}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          produto.ativo ? "bg-success-100 text-success-600" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {produto.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {formatoMoeda.format(Number(produto.preco))}
                      {produto.unidade ? ` / ${produto.unidade}` : ""}
                      {produto.campos.length > 0 &&
                        ` · ${produto.campos.length} ${produto.campos.length === 1 ? "informação configurada" : "informações configuradas"}`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variante="secundario" onClick={() => alternarAtivo(produto)}>
                    {produto.ativo ? "Desativar" : "Ativar"}
                  </Button>
                  <Button variante="secundario" onClick={() => abrirEdicao(produto)}>
                    Editar
                  </Button>
                  <Button variante="perigo" onClick={() => setProdutoParaExcluir(produto)}>
                    Excluir
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {!carregando && produtos.length > 0 && (
        <p className="mt-4 text-center text-xs text-slate-400">
          Pronto para usar? <Link to="/orcamentos/novo" className="font-medium text-facil-600 hover:underline">Criar um orçamento</Link>
        </p>
      )}

      <ProdutoFormModal
        aberto={modalAberto}
        produtoEmEdicao={produtoEmEdicao}
        aoFechar={() => setModalAberto(false)}
        aoSalvar={aoSalvarProduto}
      />

      <ConfirmDialog
        titulo="Excluir produto"
        mensagem={
          erroExclusao ??
          `Tem certeza que deseja excluir "${produtoParaExcluir?.nome}"? Esta ação não pode ser desfeita.`
        }
        aberto={produtoParaExcluir !== null}
        confirmando={excluindo}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => {
          setProdutoParaExcluir(null);
          setErroExclusao(null);
        }}
      />
    </AppLayout>
  );
}
