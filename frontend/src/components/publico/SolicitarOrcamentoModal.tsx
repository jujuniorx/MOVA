import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { Skeleton } from "../ui/Skeleton";
import { ApiError, publicoApi } from "../../lib/api";
import type { CampoProduto, ProdutoPublicoDetalhe, ValorCampoInput } from "../../lib/api";

interface SolicitarOrcamentoModalProps {
  aberto: boolean;
  aoFechar: () => void;
  slug: string;
  produtoId: string | null;
}

function CampoInput({
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
    return <Input rotulo={rotulo} value={typeof valor === "string" ? valor : ""} onChange={(e) => aoAlterarValor(e.target.value)} />;
  }
  if (campo.tipo === "NUMERO") {
    return (
      <Input
        rotulo={campo.unidade ? `${rotulo} (${campo.unidade})` : rotulo}
        type="number"
        step="0.01"
        value={typeof valor === "string" ? valor : ""}
        onChange={(e) => aoAlterarValor(e.target.value)}
      />
    );
  }
  if (campo.tipo === "SELECAO_UNICA") {
    return (
      <Select rotulo={rotulo} value={typeof valor === "string" ? valor : ""} onChange={(e) => aoAlterarValor(e.target.value)}>
        <option value="">Selecione...</option>
        {campo.opcoes.map((opcao) => (
          <option key={opcao.id} value={opcao.id}>
            {opcao.rotulo}
          </option>
        ))}
      </Select>
    );
  }
  const selecionados = Array.isArray(valor) ? valor : [];
  return (
    <div>
      <p className="text-sm font-medium text-ink-700">{rotulo}</p>
      <div className="mt-1.5 flex flex-col gap-1.5">
        {campo.opcoes.map((opcao) => (
          <label key={opcao.id} className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={selecionados.includes(opcao.id)}
              onChange={(e) => aoAlternarOpcao(opcao.id, e.target.checked)}
              className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            {opcao.rotulo}
          </label>
        ))}
      </div>
    </div>
  );
}

export function SolicitarOrcamentoModal({ aberto, aoFechar, slug, produtoId }: SolicitarOrcamentoModalProps) {
  const [produto, setProduto] = useState<ProdutoPublicoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [quantidade, setQuantidade] = useState("1");
  const [valoresCampos, setValoresCampos] = useState<Record<string, string | string[]>>({});
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<number | null>(null);

  useEffect(() => {
    if (!aberto || !produtoId) return;
    setCarregando(true);
    setErro(null);
    setEnviado(null);
    setQuantidade("1");
    setValoresCampos({});
    setClienteNome("");
    setClienteTelefone("");
    setClienteEmail("");
    setObservacoes("");
    publicoApi
      .obterProduto(slug, produtoId)
      .then(setProduto)
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar este produto."))
      .finally(() => setCarregando(false));
  }, [aberto, produtoId, slug]);

  function alterarValorCampo(campoId: string, valor: string) {
    setValoresCampos((atual) => ({ ...atual, [campoId]: valor }));
  }

  function alternarOpcao(campoId: string, opcaoId: string, marcado: boolean) {
    setValoresCampos((atual) => {
      const atuais = Array.isArray(atual[campoId]) ? (atual[campoId] as string[]) : [];
      const novos = marcado ? [...atuais, opcaoId] : atuais.filter((id) => id !== opcaoId);
      return { ...atual, [campoId]: novos };
    });
  }

  async function enviar() {
    if (!produto) return;
    setErro(null);
    if (!clienteNome.trim()) {
      setErro("Informe seu nome.");
      return;
    }
    if (!clienteTelefone.trim() && !clienteEmail.trim()) {
      setErro("Informe ao menos um telefone ou e-mail para contato.");
      return;
    }

    const valoresCamposEnvio: ValorCampoInput[] = produto.campos
      .filter((campo) => valoresCampos[campo.id] !== undefined && valoresCampos[campo.id] !== "")
      .map((campo) => ({ campoId: campo.id, valor: valoresCampos[campo.id] }));

    setEnviando(true);
    try {
      const resultado = await publicoApi.solicitarOrcamento(slug, {
        clienteNome: clienteNome.trim(),
        clienteTelefone: clienteTelefone.trim() || undefined,
        clienteEmail: clienteEmail.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        itens: [{ produtoId: produto.id, quantidade: Number(quantidade) || 1, valoresCampos: valoresCamposEnvio }],
      });
      setEnviado(resultado.numero);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível enviar sua solicitação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={produto ? `Solicitar orçamento — ${produto.nome}` : "Solicitar orçamento"} aberto={aberto} aoFechar={aoFechar}>
      {carregando && <Skeleton className="h-40" />}

      {!carregando && enviado !== null && (
        <Alert tipo="sucesso">Solicitação #{enviado} enviada! A empresa vai entrar em contato com você.</Alert>
      )}

      {!carregando && !enviado && produto && (
        <div className="flex flex-col gap-4">
          {erro && <Alert tipo="erro">{erro}</Alert>}

          <Input rotulo="Quantidade" type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />

          {produto.campos.map((campo) => (
            <CampoInput
              key={campo.id}
              campo={campo}
              valor={valoresCampos[campo.id]}
              aoAlterarValor={(valor) => alterarValorCampo(campo.id, valor)}
              aoAlternarOpcao={(opcaoId, marcado) => alternarOpcao(campo.id, opcaoId, marcado)}
            />
          ))}

          <div className="border-t border-ink-100 pt-4">
            <p className="text-sm font-semibold text-ink-900">Seus dados para contato</p>
            <div className="mt-3 flex flex-col gap-3">
              <Input rotulo="Seu nome" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} required />
              <Input rotulo="Telefone/WhatsApp" type="tel" value={clienteTelefone} onChange={(e) => setClienteTelefone(e.target.value)} />
              <Input rotulo="E-mail (opcional)" type="email" value={clienteEmail} onChange={(e) => setClienteEmail(e.target.value)} />
              <Input rotulo="Observações (opcional)" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>
          </div>

          <Button onClick={enviar} carregando={enviando} className="w-full">
            Enviar solicitação
          </Button>
        </div>
      )}
    </Modal>
  );
}
