import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { ApiError, clientesApi } from "../../lib/api";
import type { Cliente, CampoProduto, ValoresCamposCliente } from "../../lib/api";
import { clienteFormSchema } from "../../schemas/cliente.schema";
import { formatarTelefone } from "../../lib/telefone";
import { useToast } from "../../context/ToastContext";

type CamposFormulario = "nome" | "telefone" | "whatsapp" | "email" | "observacoes";

interface ClienteFormModalProps {
  aberto: boolean;
  clienteEmEdicao: Cliente | null;
  aoFechar: () => void;
  aoSalvar: (cliente: Cliente) => void;
}

const valoresIniciais = { nome: "", telefone: "", whatsapp: "", email: "", observacoes: "" };

// Uma informação extra que a própria empresa configurou (em Configurações)
// para perguntar de todo cliente — ex.: "Data de nascimento" numa clínica.
function CampoPersonalizadoInput({
  campo,
  valor,
  aoAlterar,
}: {
  campo: CampoProduto;
  valor: string | string[] | boolean | undefined;
  aoAlterar: (valor: string | string[] | boolean) => void;
}) {
  const rotulo = campo.obrigatorio ? `${campo.nome} *` : campo.nome;

  if (campo.tipo === "NUMERO") {
    return (
      <Input
        rotulo={campo.unidade ? `${rotulo} (${campo.unidade})` : rotulo}
        type="number"
        step="0.01"
        value={typeof valor === "string" ? valor : ""}
        onChange={(evento) => aoAlterar(evento.target.value)}
      />
    );
  }

  if (campo.tipo === "DATA") {
    return (
      <Input
        rotulo={rotulo}
        type="date"
        value={typeof valor === "string" ? valor : ""}
        onChange={(evento) => aoAlterar(evento.target.value)}
      />
    );
  }

  if (campo.tipo === "BOOLEANO") {
    return (
      <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
        <input
          type="checkbox"
          checked={valor === "Sim"}
          onChange={(evento) => aoAlterar(evento.target.checked ? "Sim" : "Não")}
          className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
        />
        {rotulo}
      </label>
    );
  }

  if (campo.tipo === "SELECAO_UNICA") {
    return (
      <Select rotulo={rotulo} value={typeof valor === "string" ? valor : ""} onChange={(evento) => aoAlterar(evento.target.value)}>
        <option value="">Selecione...</option>
        {campo.opcoes.map((opcao) => (
          <option key={opcao.id} value={opcao.id}>
            {opcao.rotulo}
          </option>
        ))}
      </Select>
    );
  }

  if (campo.tipo === "SELECAO_MULTIPLA") {
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
                onChange={(evento) => {
                  const proximos = evento.target.checked
                    ? [...selecionados, opcao.id]
                    : selecionados.filter((id) => id !== opcao.id);
                  aoAlterar(proximos);
                }}
                className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              {opcao.rotulo}
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Input
      rotulo={rotulo}
      value={typeof valor === "string" ? valor : ""}
      onChange={(evento) => aoAlterar(evento.target.value)}
    />
  );
}

export function ClienteFormModal({
  aberto,
  clienteEmEdicao,
  aoFechar,
  aoSalvar,
}: ClienteFormModalProps) {
  const [valores, setValores] = useState(valoresIniciais);
  const [erros, setErros] = useState<Partial<Record<CamposFormulario, string>>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [erroLimitePlano, setErroLimitePlano] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const { mostrarSucesso } = useToast();

  const [camposEmpresa, setCamposEmpresa] = useState<CampoProduto[]>([]);
  const [valoresCampos, setValoresCampos] = useState<ValoresCamposCliente>({});
  const [erroCampos, setErroCampos] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setErros({});
    setErroGeral(null);
    setErroCampos(null);
    setValores(
      clienteEmEdicao
        ? {
            nome: clienteEmEdicao.nome,
            telefone: clienteEmEdicao.telefone ?? "",
            whatsapp: clienteEmEdicao.whatsapp ?? "",
            email: clienteEmEdicao.email ?? "",
            observacoes: clienteEmEdicao.observacoes ?? "",
          }
        : valoresIniciais
    );
    setValoresCampos(clienteEmEdicao?.camposPersonalizados ?? {});

    clientesApi
      .listarCampos()
      .then(setCamposEmpresa)
      .catch(() => setCamposEmpresa([]));
  }, [aberto, clienteEmEdicao]);

  function atualizarCampo(campo: CamposFormulario, valor: string) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
  }

  function alterarValorPersonalizado(campoId: string, valor: string | string[] | boolean) {
    setValoresCampos((atual) => ({ ...atual, [campoId]: valor }));
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErroGeral(null);
    setErroLimitePlano(false);
    setErroCampos(null);

    const resultado = clienteFormSchema.safeParse(valores);
    if (!resultado.success) {
      const camposComErro: Partial<Record<CamposFormulario, string>> = {};
      for (const issue of resultado.error.issues) {
        const campo = issue.path[0] as CamposFormulario;
        camposComErro[campo] = issue.message;
      }
      setErros(camposComErro);
      return;
    }
    setErros({});

    for (const campo of camposEmpresa) {
      if (!campo.obrigatorio) continue;
      const valor = valoresCampos[campo.id];
      const vazio = valor === undefined || (typeof valor === "string" ? valor.trim() === "" : Array.isArray(valor) && valor.length === 0);
      if (vazio) {
        setErroCampos(`Preencha "${campo.nome}" antes de salvar.`);
        return;
      }
    }

    setEnviando(true);
    try {
      const dados = { ...resultado.data, camposPersonalizados: valoresCampos };
      const clienteSalvo = clienteEmEdicao
        ? await clientesApi.atualizar(clienteEmEdicao.id, dados)
        : await clientesApi.criar(dados);
      mostrarSucesso(clienteEmEdicao ? "Cliente atualizado" : "Cliente cadastrado");
      aoSalvar(clienteSalvo);
    } catch (erro) {
      setErroGeral(
        erro instanceof ApiError ? erro.message : "Não foi possível salvar o cliente. Tente novamente."
      );
      setErroLimitePlano(erro instanceof ApiError && erro.codigo === "LIMITE_PLANO");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo={clienteEmEdicao ? "Editar cliente" : "Novo cliente"}
      aberto={aberto}
      aoFechar={aoFechar}
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
        {erroCampos && <Alert tipo="erro">{erroCampos}</Alert>}

        <Input
          rotulo="Nome"
          value={valores.nome}
          onChange={(evento) => atualizarCampo("nome", evento.target.value)}
          erro={erros.nome}
          required
        />

        <Input
          rotulo="Telefone"
          type="tel"
          inputMode="tel"
          placeholder="(11) 3333-4444"
          value={valores.telefone}
          onChange={(evento) => atualizarCampo("telefone", formatarTelefone(evento.target.value))}
          erro={erros.telefone}
        />

        <Input
          rotulo="WhatsApp"
          type="tel"
          inputMode="tel"
          placeholder="(11) 91234-5678"
          dica="Usado para compartilhar orçamentos com o cliente."
          value={valores.whatsapp}
          onChange={(evento) => atualizarCampo("whatsapp", formatarTelefone(evento.target.value))}
          erro={erros.whatsapp}
        />

        <Input
          rotulo="E-mail"
          type="email"
          value={valores.email}
          onChange={(evento) => atualizarCampo("email", evento.target.value)}
          erro={erros.email}
        />

        <Input
          rotulo="Observações"
          value={valores.observacoes}
          onChange={(evento) => atualizarCampo("observacoes", evento.target.value)}
          erro={erros.observacoes}
        />

        {camposEmpresa.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-ink-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Informações adicionais
            </p>
            {camposEmpresa.map((campo) => (
              <CampoPersonalizadoInput
                key={campo.id}
                campo={campo}
                valor={valoresCampos[campo.id]}
                aoAlterar={(valor) => alterarValorPersonalizado(campo.id, valor)}
              />
            ))}
          </div>
        )}

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
