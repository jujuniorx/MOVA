import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { PageHeader } from "../components/ui/PageHeader";
import { ProdutoFormModal } from "../components/produtos/ProdutoFormModal";
import { ImportacaoModal } from "../components/importacao/ImportacaoModal";
import { AssistenteCatalogoModal } from "../components/produtos/AssistenteCatalogoModal";
import { EstimarPrecoImagemModal } from "../components/produtos/EstimarPrecoImagemModal";
import { ApiError, iaApi, produtosApi } from "../lib/api";
import type { CapacidadeIA, Produto } from "../lib/api";
import { cn } from "../lib/cn";

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
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-900/10 text-ink-900">
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

  const [capacidadesIA, setCapacidadesIA] = useState<CapacidadeIA[]>([]);
  const [assistenteAberto, setAssistenteAberto] = useState(false);
  const [importacaoAberta, setImportacaoAberta] = useState(false);
  const [precoImagemAberto, setPrecoImagemAberto] = useState(false);

  useEffect(() => {
    iaApi
      .capacidades()
      .then((r) => setCapacidadesIA(r.capacidades))
      .catch(() => setCapacidadesIA([]));
  }, []);

  const podeUsarAssistenteIA =
    capacidadesIA.includes("sugerir_produtos_segmento") || capacidadesIA.includes("estruturar_catalogo_texto");

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

  // Deep-link vindo da busca global: abre o produto encontrado para edição
  // assim que a lista carregar.
  useEffect(() => {
    const idParaAbrir = searchParams.get("abrir");
    if (!idParaAbrir || produtos.length === 0) return;
    const produto = produtos.find((p) => p.id === idParaAbrir);
    if (produto) {
      setProdutoEmEdicao(produto);
      setModalAberto(true);
      setSearchParams((atual) => {
        const novo = new URLSearchParams(atual);
        novo.delete("abrir");
        return novo;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtos]);

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
      <PageHeader
        titulo={
          <>
            Produtos e serviços
            {!carregando && <span className="ml-2 text-sm font-normal text-ink-400">({produtos.length})</span>}
          </>
        }
        subtitulo="O que você vende — aparece na hora de montar um orçamento."
        acao={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {podeUsarAssistenteIA && (
              <>
                <Button variante="secundario" className="w-full sm:w-auto" onClick={() => setAssistenteAberto(true)}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4m0 10v4m9-9h-4M7 12H3m13.66-6.66l-2.83 2.83M9.17 15.83l-2.83 2.83m11.32 0l-2.83-2.83M9.17 8.17L6.34 5.34" />
                  </svg>
                  Cadastrar com IA
                </Button>
                <Button variante="secundario" className="w-full sm:w-auto" onClick={() => setPrecoImagemAberto(true)}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8a2 2 0 012-2h1l1-2h8l1 2h1a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
                    <circle cx="12" cy="13" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Quanto devo cobrar?
                </Button>
              </>
            )}
            <Button variante="secundario" className="w-full sm:w-auto" onClick={() => setImportacaoAberta(true)}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14" />
              </svg>
              Importar
            </Button>
            <Button className="w-full sm:w-auto" onClick={() => abrirNovoProduto()}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Novo produto
            </Button>
          </div>
        }
      />

      <div className="mt-4 rounded-lg bg-brand-50 px-4 py-2.5 text-sm text-brand-700">
        Dica: você não precisa cadastrar todos os seus produtos agora. Comece pelo que mais vende.
      </div>

      <div className="mt-5 flex gap-2">
        {filtros.map((item) => (
          <button
            key={item.valor}
            type="button"
            onClick={() => setFiltro(item.valor)}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              filtro === item.valor
                ? "bg-brand-600 text-white"
                : "border border-ink-200 bg-surface text-ink-600 hover:bg-ink-50"
            )}
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
            <Skeleton key={chave} className="h-20" />
          ))}
        </div>
      )}

      {!carregando && !erro && produtos.length === 0 && filtro === "todos" && (
        <EmptyState
          className="mt-6"
          icone={<IconeProduto />}
          titulo="Você ainda não tem produtos ou serviços cadastrados."
          descricao="Cadastre o que sua empresa vende para começar."
          acao={
            <Button variante="secundario" onClick={abrirNovoProduto}>
              Cadastrar meu primeiro produto
            </Button>
          }
        />
      )}

      {!carregando && !erro && produtos.length === 0 && filtro !== "todos" && (
        <Card className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-ink-600">
            Nenhum produto {filtro === "ativos" ? "ativo" : "inativo"} no momento.
          </p>
          <button
            type="button"
            onClick={() => setFiltro("todos")}
            className="text-sm font-medium text-brand-600 hover:underline"
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
                      <p className="truncate text-sm font-medium text-ink-900">{produto.nome}</p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                          produto.ativo ? "bg-success-100 text-success-700" : "bg-ink-100 text-ink-500"
                        )}
                      >
                        {produto.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-ink-500">
                      {formatoMoeda.format(Number(produto.preco))}
                      {produto.unidade ? ` / ${produto.unidade}` : ""}
                      {produto.campos.length > 0 &&
                        ` · ${produto.campos.length} ${produto.campos.length === 1 ? "informação configurada" : "informações configuradas"}`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button tamanho="sm" variante="secundario" onClick={() => alternarAtivo(produto)}>
                    {produto.ativo ? "Desativar" : "Ativar"}
                  </Button>
                  <Button tamanho="sm" variante="secundario" onClick={() => abrirEdicao(produto)}>
                    Editar
                  </Button>
                  <Button tamanho="sm" variante="perigo" onClick={() => setProdutoParaExcluir(produto)}>
                    Excluir
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {!carregando && produtos.length > 0 && (
        <p className="mt-4 text-center text-xs text-ink-400">
          Pronto para usar?{" "}
          <Link to="/orcamentos/novo" className="font-medium text-brand-600 hover:underline">
            Criar um orçamento
          </Link>
        </p>
      )}

      <ProdutoFormModal
        aberto={modalAberto}
        produtoEmEdicao={produtoEmEdicao}
        aoFechar={() => setModalAberto(false)}
        aoSalvar={aoSalvarProduto}
      />

      <AssistenteCatalogoModal
        aberto={assistenteAberto}
        aoFechar={() => setAssistenteAberto(false)}
        aoConcluir={() => {
          setAssistenteAberto(false);
          carregarProdutos();
        }}
        capacidadesIA={capacidadesIA}
      />

      <EstimarPrecoImagemModal aberto={precoImagemAberto} aoFechar={() => setPrecoImagemAberto(false)} />

      <ImportacaoModal
        titulo="Importar produtos"
        aberto={importacaoAberta}
        aoFechar={() => setImportacaoAberta(false)}
        aoConcluir={carregarProdutos}
        apiPreview={produtosApi.importarPreview}
        apiConfirmar={produtosApi.importarConfirmar}
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
