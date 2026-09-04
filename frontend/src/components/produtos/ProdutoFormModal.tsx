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
import type { CampoInput, CampoProduto, Produto } from "../../lib/api";
import { produtoFormSchema } from "../../schemas/produto.schema";
import { useToast } from "../../context/ToastContext";

type CamposTexto = "nome" | "descricao" | "preco" | "unidade" | "sku" | "estoqueMinimo";

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

      const camposExistentes = paraCampoRascunho(produtoEmEdicao.campos);
      setCampos(camposExistentes);
      setMostrarCampos(camposExistentes.length > 0);
      setTinhaCamposAoAbrir(camposExistentes.length > 0);
    } else {
      setValores(valoresIniciais);
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

      mostrarSucesso(produtoEmEdicao ? "✓ Produto atualizado" : "✓ Produto cadastrado");
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
          placeholder="Ex: Portão, Limpeza de sofá, Ensaio fotográfico..."
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
              <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
                <input
                  type="checkbox"
                  checked={valores.controlaEstoque}
                  onChange={(evento) => setValores((atual) => ({ ...atual, controlaEstoque: evento.target.checked }))}
                  className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                Controlar estoque deste produto
              </label>

              {valores.controlaEstoque && (
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

      <div className="mt-3 flex flex-col gap-2">
        {itens.map((item, indice) => (
          <div key={indice} className="flex gap-2">
            <Select
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
            <Input
              rotulo="Qtd."
              className="w-20"
              type="number"
              min={1}
              value={item.quantidade}
              onChange={(e) => atualizarItem(indice, "quantidade", e.target.value)}
            />
            <Button tamanho="sm" variante="discreto" type="button" onClick={() => setItens((atual) => atual.filter((_, i) => i !== indice))}>
              Remover
            </Button>
          </div>
        ))}
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
