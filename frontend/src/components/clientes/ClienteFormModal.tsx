import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { ApiError, clientesApi } from "../../lib/api";
import type { Cliente } from "../../lib/api";
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

export function ClienteFormModal({
  aberto,
  clienteEmEdicao,
  aoFechar,
  aoSalvar,
}: ClienteFormModalProps) {
  const [valores, setValores] = useState(valoresIniciais);
  const [erros, setErros] = useState<Partial<Record<CamposFormulario, string>>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const { mostrarSucesso } = useToast();

  useEffect(() => {
    if (!aberto) return;
    setErros({});
    setErroGeral(null);
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
  }, [aberto, clienteEmEdicao]);

  function atualizarCampo(campo: CamposFormulario, valor: string) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErroGeral(null);

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

    setEnviando(true);
    try {
      const clienteSalvo = clienteEmEdicao
        ? await clientesApi.atualizar(clienteEmEdicao.id, resultado.data)
        : await clientesApi.criar(resultado.data);
      mostrarSucesso(clienteEmEdicao ? "✓ Cliente atualizado" : "✓ Cliente cadastrado");
      aoSalvar(clienteSalvo);
    } catch (erro) {
      setErroGeral(
        erro instanceof ApiError ? erro.message : "Não foi possível salvar o cliente. Tente novamente."
      );
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
        {erroGeral && <Alert tipo="erro">{erroGeral}</Alert>}

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
