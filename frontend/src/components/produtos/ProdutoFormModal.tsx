import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { CamposBuilder, campoRascunhoVazio } from "./CamposBuilder";
import type { CampoRascunho } from "./CamposBuilder";
import { ApiError, produtosApi } from "../../lib/api";
import type { CampoInput, CampoProduto, Produto, VariacaoInput } from "../../lib/api";
import { produtoFormSchema } from "../../schemas/produto.schema";
import { useToast } from "../../context/ToastContext";
import { cn } from "../../lib/cn";

type CamposTexto = "nome" | "descricao" | "preco" | "unidade" | "sku" | "estoqueMinimo";

// "Produto" ou "Serviço" é só uma pergunta em linguagem simples que decide o
// valor de `controlaEstoque` (o campo que já existe e já é usado em toda a
// regra de negócio real — orçamento, venda, estoque). Não é um campo novo:
// é a mesma informação, perguntada de um jeito que não exige saber o que
// "controlar estoque" significa. Um produto físico que a empresa não quer
// rastrear em estoque continua podendo escolher "Produto" e deixar a opção
// de estoque desmarcada — a pergunta só decide se a opção aparece ou não.
type OfertaTipo = "produto" | "servico";

function inferirOfertaTipo(controlaEstoque: boolean): OfertaTipo {
  return controlaEstoque ? "produto" : "servico";
}

interface ProdutoFormModalProps {
  aberto: boolean;
  produtoEmEdicao: Produto | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}

const valoresIniciais = {
  nome: "",
  descricao: "",
  preco: "",
  unidade: "",
  ativo: true,
  tipoProduto: "SIMPLES" as "SIMPLES" | "KIT",
  controlaEstoque: false,
  sku: "",
  estoqueMinimo: "",
  exibirNaPaginaPublica: false,
};

const PRESETS_COBRANCA = [
  { valor: "unidade", rotulo: "Por unidade" },
  { valor: "hora", rotulo: "Por hora" },
  { valor: "dia", rotulo: "Por dia" },
  { valor: "metro", rotulo: "Por metro" },
  { valor: "m²", rotulo: "Por m²" },
  { valor: "kg", rotulo: "Por kg" },
  { valor: "litro", rotulo: "Por litro" },
  { valor: "serviço", rotulo: "Por serviço" },
  { valor: "sessão", rotulo: "Por sessão" },
  { valor: "pacote", rotulo: "Por pacote" },
  { valor: "projeto", rotulo: "Por projeto" },
  { valor: "evento", rotulo: "Por evento" },
  { valor: "mensalidade", rotulo: "Mensalidade" },
];

function paraCampoRascunho(campos: CampoProduto[]): CampoRascunho[] {
  return campos.map((campo) => ({
    chave: campo.id,
    nome: campo.nome,
    tipo: campo.tipo,
    unidade: campo.unidade ?? "",
    obrigatorio: campo.obrigatorio,
    opcoes: campo.opcoes.map((opcao) => ({ chave: opcao.id, rotulo: opcao.rotulo })),
  }));
}

function paraCampoInput(campos: CampoRascunho[]): CampoInput[] {
  return campos
    .filter((campo) => campo.nome.trim() !== "")
    .map((campo) => ({
      nome: campo.nome.trim(),
      tipo: campo.tipo,
      unidade: campo.unidade.trim() || undefined,
      obrigatorio: campo.obrigatorio,
      opcoes: campo.opcoes
        .filter((opcao) => opcao.rotulo.trim() !== "")
        .map((opcao) => ({ rotulo: opcao.rotulo.trim() })),
    }));
}

export function ProdutoFormModal({
  aberto,
  produtoEmEdicao,
  aoFechar,
  aoSalvar,
}: ProdutoFormModalProps) {
  const [valores, setValores] = useState(valoresIniciais);
  const [formaCobranca, setFormaCobranca] = useState("");
  const [erros, setErros] = useState<Partial<Record<CamposTexto, string>>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [erroLimitePlano, setErroLimitePlano] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const { mostrarSucesso } = useToast();

  const [mostrarCampos, setMostrarCampos] = useState(false);
  const [campos, setCampos] = useState<CampoRascunho[]>([]);
  const [tinhaCamposAoAbrir, setTinhaCamposAoAbrir] = useState(false);
  const [ofertaTipo, setOfertaTipo] = useState<OfertaTipo>("servico");

  useEffect(() => {
    if (!aberto) return;
    setErros({});
    setErroGeral(null);

    if (produtoEmEdicao) {
      const unidadeAtual = produtoEmEdicao.unidade ?? "";
      const presetConhecido = PRESETS_COBRANCA.some((preset) => preset.valor === unidadeAtual);
      setValores({
        nome: produtoEmEdicao.nome,
        descricao: produtoEmEdicao.descricao ?? "",
        preco: produtoEmEdicao.preco,
        unidade: unidadeAtual,
        ativo: produtoEmEdicao.ativo,
        tipoProduto: produtoEmEdicao.tipoProduto,
        controlaEstoque: produtoEmEdicao.controlaEstoque,
        sku: produtoEmEdicao.sku ?? "",
        estoqueMinimo: produtoEmEdicao.estoqueMinimo === null ? "" : String(produtoEmEdicao.estoqueMinimo),
        exibirNaPaginaPublica: produtoEmEdicao.exibirNaPaginaPublica,
      });
      setFormaCobranca(unidadeAtual === "" ? "" : presetConhecido ? unidadeAtual : "OUTRO");
      setOfertaTipo(inferirOfertaTipo(produtoEmEdicao.controlaEstoque));

      const camposExistentes = paraCampoRascunho(produtoEmEdicao.campos);
      setCampos(camposExistentes);
      setMostrarCampos(camposExistentes.length > 0);
      setTinhaCamposAoAbrir(camposExistentes.length > 0);
    } else {
      setValores(valoresIniciais);
      setOfertaTipo("servico");
      setFormaCobranca("");
      setCampos([]);
      setMostrarCampos(false);
      setTinhaCamposAoAbrir(false);
    }
  }, [aberto, produtoEmEdicao]);

  function atualizarCampoTexto(campo: CamposTexto, valor: string) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
  }

  function selecionarFormaCobranca(valor: string) {
    setFormaCobranca(valor);
    if (valor !== "OUTRO") {
      atualizarCampoTexto("unidade", valor);
    } else {
      atualizarCampoTexto("unidade", "");
    }
  }

  function abrirConstrutorDeCampos() {
    setMostrarCampos(true);
    if (campos.length === 0) {
      setCampos([campoRascunhoVazio()]);
    }
  }

  // Escolher "Serviço" sempre desmarca "controlar estoque" (um serviço não
  // tem saldo pra rastrear) — escolher "Produto" só revela a opção, nunca a
  // marca sozinho, a empresa decide se quer mesmo controlar estoque.
  function escolherOfertaTipo(tipo: OfertaTipo) {
    setOfertaTipo(tipo);
    if (tipo === "servico") {
      setValores((atual) => ({ ...atual, controlaEstoque: false }));
    }
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErroGeral(null);
    setErroLimitePlano(false);

    const resultado = produtoFormSchema.safeParse({
      ...valores,
      preco: valores.preco === "" ? Number.NaN : Number(valores.preco),
      estoqueMinimo: valores.estoqueMinimo === "" ? undefined : Number(valores.estoqueMinimo),
      sku: valores.sku,
    });

    if (!resultado.success) {
      const camposComErro: Partial<Record<CamposTexto, string>> = {};
      for (const issue of resultado.error.issues) {
        const campo = issue.path[0] as CamposTexto;
        camposComErro[campo] = issue.message;
      }
      setErros(camposComErro);
      return;
    }
    setErros({});

    const camposParaSalvar = mostrarCampos ? paraCampoInput(campos) : [];
    const campoComOpcoesVazias = camposParaSalvar.find(
      (campo) =>
        (campo.tipo === "SELECAO_UNICA" || campo.tipo === "SELECAO_MULTIPLA") &&
        (!campo.opcoes || campo.opcoes.length === 0)
    );
    if (campoComOpcoesVazias) {
      setErroGeral(`Adicione ao menos uma opção para o campo "${campoComOpcoesVazias.nome}".`);
      return;
    }

    setEnviando(true);
    try {
      const produtoSalvo = produtoEmEdicao
        ? await produtosApi.atualizar(produtoEmEdicao.id, resultado.data)
        : await produtosApi.criar(resultado.data);

      if (camposParaSalvar.length > 0 || tinhaCamposAoAbrir) {
        await produtosApi.atualizarCampos(produtoSalvo.id, camposParaSalvar);
      }

      mostrarSucesso(produtoEmEdicao ? "Produto atualizado" : "Produto cadastrado");
      aoSalvar();
    } catch (erro) {
      setErroGeral(
        erro instanceof ApiError ? erro.message : "Não foi possível salvar o produto. Tente novamente."
      );
      setErroLimitePlano(erro instanceof ApiError && erro.codigo === "LIMITE_PLANO");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo={produtoEmEdicao ? "Editar produto/serviço" : "Novo produto/serviço"}
      aberto={aberto}
      aoFechar={aoFechar}
      tamanho={mostrarCampos ? "grande" : "padrao"}
    >
      <form className="flex flex-col gap-4" onSubmit={aoEnviar} noValidate>
        {erroGeral && (
          <Alert tipo="erro">
            {erroGeral}
            {erroLimitePlano && (
              <>
                {" "}
                <Link to="/planos" className="font-semibold underline">
                  Ver planos
                </Link>
              </>
            )}
          </Alert>
        )}

        <Input
          rotulo="Nome"
          placeholder="Nome do produto ou serviço"
          value={valores.nome}
          onChange={(evento) => atualizarCampoTexto("nome", evento.target.value)}
          erro={erros.nome}
          required
        />

        <Input
          rotulo="Descrição"
          value={valores.descricao}
          onChange={(evento) => atualizarCampoTexto("descricao", evento.target.value)}
          erro={erros.descricao}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            rotulo="Preço (R$)"
            type="number"
            min="0"
            step="0.01"
            value={valores.preco}
            onChange={(evento) => atualizarCampoTexto("preco", evento.target.value)}
            erro={erros.preco}
            required
          />

          <Select
            rotulo="Forma de cobrança"
            id="forma-cobranca"
            value={formaCobranca}
            onChange={(evento) => selecionarFormaCobranca(evento.target.value)}
          >
            <option value="">Selecione...</option>
            {PRESETS_COBRANCA.map((preset) => (
              <option key={preset.valor} value={preset.valor}>
                {preset.rotulo}
              </option>
            ))}
            <option value="OUTRO">Outro...</option>
          </Select>
        </div>

        {formaCobranca === "OUTRO" && (
          <Input
            rotulo="Qual?"
            placeholder="Ex: por m², por diária..."
            value={valores.unidade}
            onChange={(evento) => atualizarCampoTexto("unidade", evento.target.value)}
            erro={erros.unidade}
          />
        )}

        <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
          <input
            type="checkbox"
            checked={valores.ativo}
            onChange={(evento) => setValores((atual) => ({ ...atual, ativo: evento.target.checked }))}
            className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          />
          Ativo (disponível para novos orçamentos)
        </label>

        <div className="border-t border-ink-100 pt-4">
          <Select
            rotulo="Tipo de produto"
            value={valores.tipoProduto}
            onChange={(evento) => setValores((atual) => ({ ...atual, tipoProduto: evento.target.value as "SIMPLES" | "KIT" }))}
          >
            <option value="SIMPLES">Produto simples</option>
            <option value="KIT">Kit (composto por outros produtos)</option>
          </Select>

          {valores.tipoProduto === "SIMPLES" && (
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <p className="text-sm font-medium text-ink-700">O que você oferece?</p>
                <div className="mt-1.5 inline-flex rounded-lg border border-ink-200 bg-surface p-1">
                  <button
                    type="button"
                    onClick={() => escolherOfertaTipo("produto")}
                    aria-pressed={ofertaTipo === "produto"}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      ofertaTipo === "produto" ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-ink-50"
                    )}
                  >
                    Produto físico
                  </button>
                  <button
                    type="button"
                    onClick={() => escolherOfertaTipo("servico")}
                    aria-pressed={ofertaTipo === "servico"}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      ofertaTipo === "servico" ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-ink-50"
                    )}
                  >
                    Serviço
                  </button>
                </div>
              </div>

              {ofertaTipo === "produto" && (
                <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
                  <input
                    type="checkbox"
                    checked={valores.controlaEstoque}
                    onChange={(evento) => setValores((atual) => ({ ...atual, controlaEstoque: evento.target.checked }))}
                    className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                  />
                  Controlar quanto tenho em estoque deste produto
                </label>
              )}

              {ofertaTipo === "produto" && valores.controlaEstoque && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    rotulo="SKU (opcional)"
                    value={valores.sku}
                    onChange={(evento) => atualizarCampoTexto("sku", evento.target.value)}
                    erro={erros.sku}
                  />
                  <Input
                    rotulo="Estoque mínimo (opcional)"
                    type="number"
                    min="0"
                    value={valores.estoqueMinimo}
                    onChange={(evento) => atualizarCampoTexto("estoqueMinimo", evento.target.value)}
                    erro={erros.estoqueMinimo}
                  />
                </div>
              )}
            </div>
          )}

          <label className="mt-3 flex items-center gap-2 text-sm font-medium text-ink-700">
            <input
              type="checkbox"
              checked={valores.exibirNaPaginaPublica}
              onChange={(evento) => setValores((atual) => ({ ...atual, exibirNaPaginaPublica: evento.target.checked }))}
              className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            Exibir na página pública da empresa
          </label>

          {valores.tipoProduto === "KIT" && !produtoEmEdicao && (
            <p className="mt-3 text-sm text-ink-500">
              Salve o kit primeiro — depois edite-o novamente para escolher os produtos que o compõem.
            </p>
          )}

          {valores.tipoProduto === "KIT" && produtoEmEdicao && (
            <EditorComponentesKit produtoId={produtoEmEdicao.id} itensAtuais={produtoEmEdicao.itensDoKit} />
          )}

          {valores.tipoProduto === "SIMPLES" && produtoEmEdicao && (
            <EditorVariacoes produtoId={produtoEmEdicao.id} variacoesAtuais={produtoEmEdicao.variacoes} />
          )}
          {valores.tipoProduto === "SIMPLES" && !produtoEmEdicao && (
            <p className="mt-3 text-sm text-ink-500">
              Salve o produto primeiro — depois edite-o novamente para cadastrar variações (tamanho, cor, voltagem...).
            </p>
          )}
        </div>

        <div className="border-t border-ink-100 pt-4">
          <p className="text-sm font-semibold text-ink-900">Informações para fazer o orçamento</p>
          <p className="mt-1 text-sm text-ink-500">
            Adicione as informações que você precisa saber sobre este produto ou serviço para
            preparar o orçamento — como tamanho, material, modelo ou qualquer outra característica.
          </p>

          <div className="mt-3">
            {!mostrarCampos ? (
              <Button type="button" variante="secundario" onClick={abrirConstrutorDeCampos}>
                + Adicionar informação
              </Button>
            ) : (
              <CamposBuilder campos={campos} aoAlterar={setCampos} />
            )}
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variante="secundario" onClick={aoFechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" carregando={enviando}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Editor inline dos componentes de um kit já salvo — substitui a lista inteira a cada salvar. */
function EditorComponentesKit({
  produtoId,
  itensAtuais,
}: {
  produtoId: string;
  itensAtuais: Produto["itensDoKit"];
}) {
  const [disponiveis, setDisponiveis] = useState<Produto[]>([]);
  const [itens, setItens] = useState(
    itensAtuais.map((item) => ({ componenteProdutoId: item.componenteProdutoId, quantidade: String(item.quantidade) }))
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    produtosApi.listar().then((lista) => setDisponiveis(lista.filter((p) => p.id !== produtoId && p.tipoProduto === "SIMPLES")));
  }, [produtoId]);

  function atualizarItem(indice: number, campo: "componenteProdutoId" | "quantidade", valor: string) {
    setItens((atual) => atual.map((it, i) => (i === indice ? { ...it, [campo]: valor } : it)));
    setSucesso(false);
  }

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      const itensValidos = itens
        .filter((it) => it.componenteProdutoId && Number(it.quantidade) > 0)
        .map((it) => ({ componenteProdutoId: it.componenteProdutoId, quantidade: Number(it.quantidade) }));
      await produtosApi.atualizarKit(produtoId, itensValidos);
      setSucesso(true);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível salvar os componentes do kit.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-ink-200 p-4">
      <p className="text-sm font-semibold text-ink-900">Componentes do kit</p>
      <p className="mt-1 text-sm text-ink-500">Ao vender este kit, o estoque de cada componente abaixo é debitado automaticamente.</p>

      {erro && (
        <div className="mt-2">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}
      {sucesso && (
        <div className="mt-2">
          <Alert tipo="sucesso">Componentes salvos.</Alert>
        </div>
      )}

      <ul className="mt-3 flex flex-col gap-3">
        {itens.map((item, indice) => (
          <li key={indice} className="rounded-lg border border-ink-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <Select
                rotulo="Componente"
                className="flex-1"
                value={item.componenteProdutoId}
                onChange={(e) => atualizarItem(indice, "componenteProdutoId", e.target.value)}
              >
                <option value="">Selecione um produto...</option>
                {disponiveis.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setItens((atual) => atual.filter((_, i) => i !== indice))}
                aria-label="Remover componente"
                className="mt-6 shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-danger-600"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-3 w-32">
              <Input
                rotulo="Quantidade"
                type="number"
                min={1}
                value={item.quantidade}
                onChange={(e) => atualizarItem(indice, "quantidade", e.target.value)}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-col gap-2">
        <Button
          tamanho="sm"
          variante="secundario"
          type="button"
          onClick={() => setItens((atual) => [...atual, { componenteProdutoId: "", quantidade: "1" }])}
        >
          + Adicionar componente
        </Button>
        <Button tamanho="sm" type="button" onClick={salvar} carregando={salvando} className="mt-1 w-fit">
          Salvar componentes
        </Button>
      </div>
    </div>
  );
}

interface VariacaoRascunho {
  chave: string;
  id?: string;
  nome: string;
  sku: string;
  precoAdicional: string;
  ativa: boolean;
}

/** Editor inline das variações de um produto já salvo (ex.: tamanho, cor, voltagem) — cada uma tem seu próprio estoque. */
function EditorVariacoes({ produtoId, variacoesAtuais }: { produtoId: string; variacoesAtuais: Produto["variacoes"] }) {
  const [variacoes, setVariacoes] = useState<VariacaoRascunho[]>(
    variacoesAtuais.map((v) => ({
      chave: v.id,
      id: v.id,
      nome: v.nome,
      sku: v.sku ?? "",
      precoAdicional: v.precoAdicional === "0" ? "" : v.precoAdicional,
      ativa: v.ativa,
    }))
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  function atualizar(chave: string, campo: "nome" | "sku" | "precoAdicional", valor: string) {
    setVariacoes((atual) => atual.map((v) => (v.chave === chave ? { ...v, [campo]: valor } : v)));
    setSucesso(false);
  }

  function alternarAtiva(chave: string) {
    setVariacoes((atual) => atual.map((v) => (v.chave === chave ? { ...v, ativa: !v.ativa } : v)));
    setSucesso(false);
  }

  async function salvar() {
    setErro(null);
    const validas = variacoes.filter((v) => v.nome.trim() !== "");
    if (validas.length !== variacoes.length) {
      setErro("Toda variação precisa de um nome (ex.: P, M, G).");
      return;
    }
    setSalvando(true);
    try {
      const dados: VariacaoInput[] = validas.map((v) => ({
        nome: v.nome.trim(),
        sku: v.sku.trim() || undefined,
        precoAdicional: v.precoAdicional === "" ? 0 : Number(v.precoAdicional),
        ativa: v.ativa,
      }));
      await produtosApi.atualizarVariacoes(produtoId, dados);
      setSucesso(true);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível salvar as variações.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-ink-200 p-4">
      <p className="text-sm font-semibold text-ink-900">Variações</p>
      <p className="mt-1 text-sm text-ink-500">
        Use quando este produto existe em versões diferentes (tamanho, cor, voltagem...) — cada variação tem seu
        próprio estoque. Preço adicional é somado ao preço do produto quando essa variação é escolhida.
      </p>

      {erro && (
        <div className="mt-2">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}
      {sucesso && (
        <div className="mt-2">
          <Alert tipo="sucesso">Variações salvas.</Alert>
        </div>
      )}

      <ul className="mt-3 flex flex-col gap-3">
        {variacoes.map((v) => (
          <li key={v.chave} className="rounded-lg border border-ink-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <Input
                rotulo="Nome"
                placeholder="Ex: P, M, G ou Azul, Vermelho..."
                className="flex-1"
                value={v.nome}
                onChange={(e) => atualizar(v.chave, "nome", e.target.value)}
              />
              <button
                type="button"
                onClick={() => setVariacoes((atual) => atual.filter((it) => it.chave !== v.chave))}
                aria-label="Remover variação"
                className="mt-6 shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-danger-600"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                rotulo="SKU (opcional)"
                value={v.sku}
                onChange={(e) => atualizar(v.chave, "sku", e.target.value)}
              />
              <Input
                rotulo="Preço adicional (opcional)"
                type="number"
                step="0.01"
                value={v.precoAdicional}
                onChange={(e) => atualizar(v.chave, "precoAdicional", e.target.value)}
              />
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm font-medium text-ink-700">
              <input
                type="checkbox"
                checked={v.ativa}
                onChange={() => alternarAtiva(v.chave)}
                className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              Ativa (disponível para escolher)
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-col gap-2">
        <Button
          tamanho="sm"
          variante="secundario"
          type="button"
          onClick={() =>
            setVariacoes((atual) => [
              ...atual,
              { chave: crypto.randomUUID(), nome: "", sku: "", precoAdicional: "", ativa: true },
            ])
          }
        >
          + Adicionar variação
        </Button>
        <Button tamanho="sm" type="button" onClick={salvar} carregando={salvando} className="mt-1 w-fit">
          Salvar variações
        </Button>
      </div>
    </div>
  );
}
