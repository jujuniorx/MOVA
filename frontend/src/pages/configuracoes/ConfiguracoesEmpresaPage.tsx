import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CategoriaConfiguracoesLayout } from "../../components/configuracoes/CategoriaConfiguracoesLayout";
import { Card, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { EquipeCard } from "../../components/configuracoes/EquipeCard";
import { useAuth } from "../../context/AuthContext";
import { ApiError, empresaApi } from "../../lib/api";
import { empresaFormSchema } from "../../schemas/empresa.schema";
import { formatarTelefone } from "../../lib/telefone";

type CamposTexto = "nome" | "telefone" | "whatsapp" | "email" | "endereco" | "descricao";

export function ConfiguracoesEmpresaPage() {
  const { empresa, atualizarEmpresa } = useAuth();
  const [valores, setValores] = useState({ nome: "", telefone: "", whatsapp: "", email: "", endereco: "", descricao: "" });
  const [erros, setErros] = useState<Partial<Record<CamposTexto, string>>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!empresa) return;
    setValores({
      nome: empresa.nome,
      telefone: empresa.telefone ?? "",
      whatsapp: empresa.whatsapp ?? "",
      email: empresa.email ?? "",
      endereco: empresa.endereco ?? "",
      descricao: empresa.descricao ?? "",
    });
  }, [empresa]);

  function atualizarCampo(campo: CamposTexto, valor: string) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
    setSucesso(false);
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErroGeral(null);
    setSucesso(false);

    const resultado = empresaFormSchema.safeParse(valores);
    if (!resultado.success) {
      const camposComErro: Partial<Record<CamposTexto, string>> = {};
      for (const issue of resultado.error.issues) {
        camposComErro[issue.path[0] as CamposTexto] = issue.message;
      }
      setErros(camposComErro);
      return;
    }
    setErros({});
    setSalvando(true);
    try {
      const empresaAtualizada = await empresaApi.atualizar(resultado.data);
      atualizarEmpresa(empresaAtualizada);
      setSucesso(true);
    } catch (erro) {
      setErroGeral(erro instanceof ApiError ? erro.message : "Não foi possível salvar agora.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <CategoriaConfiguracoesLayout
      titulo="Minha empresa"
      descricao="Quem é a sua empresa e quem, na sua equipe, tem acesso ao MOVA."
    >
      <Card>
        <CardHeader
          titulo="Informações básicas"
          descricao="Essas informações ajudam seus clientes a saber quem você é e como entrar em contato — aparecem nos orçamentos e na sua página pública."
        />
        <form className="mt-4 flex flex-col gap-4" onSubmit={aoEnviar} noValidate>
          {erroGeral && <Alert tipo="erro">{erroGeral}</Alert>}
          {sucesso && <Alert tipo="sucesso">Alterações salvas.</Alert>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              rotulo="Nome da empresa"
              value={valores.nome}
              onChange={(e) => atualizarCampo("nome", e.target.value)}
              erro={erros.nome}
              required
            />
            <Input
              rotulo="E-mail"
              type="email"
              value={valores.email}
              onChange={(e) => atualizarCampo("email", e.target.value)}
              erro={erros.email}
            />
            <Input
              rotulo="Telefone"
              type="tel"
              inputMode="tel"
              placeholder="(11) 3333-4444"
              value={valores.telefone}
              onChange={(e) => atualizarCampo("telefone", formatarTelefone(e.target.value))}
              erro={erros.telefone}
            />
            <Input
              rotulo="WhatsApp"
              type="tel"
              inputMode="tel"
              placeholder="(11) 91234-5678"
              dica="Usado no botão de compartilhar orçamentos e na página pública."
              value={valores.whatsapp}
              onChange={(e) => atualizarCampo("whatsapp", formatarTelefone(e.target.value))}
              erro={erros.whatsapp}
            />
            <div className="sm:col-span-2">
              <Input rotulo="Endereço" value={valores.endereco} onChange={(e) => atualizarCampo("endereco", e.target.value)} erro={erros.endereco} />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                rotulo="Descrição"
                dica="Uma frase curta sobre o que sua empresa faz — aparece na sua página pública."
                value={valores.descricao}
                onChange={(e) => atualizarCampo("descricao", e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" carregando={salvando}>
              Salvar informações
            </Button>
          </div>
        </form>
      </Card>

      <EquipeCard />
    </CategoriaConfiguracoesLayout>
  );
}
