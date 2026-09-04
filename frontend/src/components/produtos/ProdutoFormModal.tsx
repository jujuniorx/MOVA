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

type CamposTexto = "nome" | "descricao" | "preco" | "unidade";

interface ProdutoFormModalProps {
  aberto: boolean;
  produtoEmEdicao: Produto | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}

const valoresIniciais = { nome: "", descricao: "", preco: "", unidade: "", ativo: true };

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
