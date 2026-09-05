import { useEffect, useState } from "react";
import { Card, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { CamposBuilder } from "../produtos/CamposBuilder";
import type { CampoRascunho } from "../produtos/CamposBuilder";
import { ApiError, clientesApi } from "../../lib/api";
import type { CampoProduto } from "../../lib/api";

function paraRascunho(campos: CampoProduto[]): CampoRascunho[] {
  return campos.map((campo) => ({
    chave: campo.id,
    nome: campo.nome,
    tipo: campo.tipo,
    unidade: campo.unidade ?? "",
    obrigatorio: campo.obrigatorio,
    opcoes: campo.opcoes.map((opcao) => ({ chave: opcao.id, rotulo: opcao.rotulo })),
  }));
}

/**
 * "Quais informações você precisa saber de todo cliente?" — ex.: uma
 * clínica pode pedir "Data de nascimento", uma arquitetura pode pedir
 * "Endereço da obra". Vale para a empresa inteira (não por cliente), então
 * reaparece igual no cadastro de qualquer cliente.
 */
export function CamposClienteCard() {
  const [carregando, setCarregando] = useState(true);
  const [campos, setCampos] = useState<CampoRascunho[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    clientesApi
      .listarCampos()
      .then((existentes) => setCampos(paraRascunho(existentes)))
      .catch(() => setErro("Não foi possível carregar as informações personalizadas."))
      .finally(() => setCarregando(false));
  }, []);

  async function salvar() {
    setErro(null);
    setSucesso(false);
    setSalvando(true);
    try {
      const camposParaSalvar = campos
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
      const salvos = await clientesApi.atualizarCampos(camposParaSalvar);
      setCampos(paraRascunho(salvos));
      setSucesso(true);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível salvar as informações personalizadas.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return null;

  return (
    <Card>
      <CardHeader
        titulo="Informações que você pergunta do cliente"
        descricao="Além de nome e contato, o que mais você costuma precisar saber? Vale para todos os clientes."
      />
      <div className="mt-4 flex flex-col gap-4">
        {erro && <Alert tipo="erro">{erro}</Alert>}
        {sucesso && <Alert tipo="sucesso">Informações salvas.</Alert>}

        <CamposBuilder campos={campos} aoAlterar={setCampos} />

        <div>
          <Button type="button" onClick={salvar} carregando={salvando}>
            Salvar informações
          </Button>
        </div>
      </div>
    </Card>
  );
}
