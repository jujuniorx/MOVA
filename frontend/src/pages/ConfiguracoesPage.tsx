import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { OnboardingWizard } from "../components/onboarding/OnboardingWizard";
import { useAuth } from "../context/AuthContext";
import { ApiError, empresaApi } from "../lib/api";
import { empresaFormSchema } from "../schemas/empresa.schema";
import { formatarTelefone } from "../lib/telefone";

type CamposTexto =
  | "nome"
  | "telefone"
  | "whatsapp"
  | "email"
  | "endereco"
  | "descricao"
  | "logoUrl";

const COR_PADRAO = "#0f172a";

export function ConfiguracoesPage() {
  const { empresa, atualizarEmpresa } = useAuth();

  const [valores, setValores] = useState({
    nome: "",
    telefone: "",
    whatsapp: "",
    email: "",
    endereco: "",
    descricao: "",
    logoUrl: "",
    corPrimaria: COR_PADRAO,
    corSecundaria: COR_PADRAO,
  });

  const [erros, setErros] = useState<Partial<Record<CamposTexto, string>>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false);

  useEffect(() => {
    if (!empresa) return;
    setValores({
      nome: empresa.nome,
      telefone: empresa.telefone ?? "",
      whatsapp: empresa.whatsapp ?? "",
      email: empresa.email ?? "",
      endereco: empresa.endereco ?? "",
      descricao: empresa.descricao ?? "",
      logoUrl: empresa.logoUrl ?? "",
      corPrimaria: empresa.corPrimaria ?? COR_PADRAO,
      corSecundaria: empresa.corSecundaria ?? COR_PADRAO,
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
        const campo = issue.path[0] as CamposTexto;
        camposComErro[campo] = issue.message;
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
      setErroGeral(
        erro instanceof ApiError ? erro.message : "Não foi possível salvar as configurações."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AppLayout>
      <h1 className="text-xl font-semibold text-slate-900">Configurações do negócio</h1>
      <p className="mt-1 text-sm text-slate-500">
        Essas informações aparecem nos orçamentos enviados aos seus clientes — é a identidade da
        sua empresa, não do OrçaFácil.
      </p>

      <form className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3" onSubmit={aoEnviar} noValidate>
        <div className="flex flex-col gap-6 lg:col-span-2">
          {erroGeral && <Alert tipo="erro">{erroGeral}</Alert>}
          {sucesso && <Alert tipo="sucesso">Configurações salvas com sucesso.</Alert>}

          <Card>
            <h2 className="text-base font-semibold text-slate-900">Dados da empresa</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                rotulo="Nome da empresa"
                value={valores.nome}
                onChange={(evento) => atualizarCampo("nome", evento.target.value)}
                erro={erros.nome}
                required
              />
              <Input
                rotulo="E-mail"
                type="email"
                value={valores.email}
                onChange={(evento) => atualizarCampo("email", evento.target.value)}
                erro={erros.email}
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
              <div>
                <Input
                  rotulo="WhatsApp"
                  type="tel"
                  inputMode="tel"
                  placeholder="(11) 91234-5678"
                  value={valores.whatsapp}
                  onChange={(evento) => atualizarCampo("whatsapp", formatarTelefone(evento.target.value))}
                  erro={erros.whatsapp}
                />
                <p className="mt-1 text-xs text-slate-500">Usado no botão de compartilhar orçamentos.</p>
              </div>
              <div className="sm:col-span-2">
                <Input
                  rotulo="Endereço"
                  value={valores.endereco}
                  onChange={(evento) => atualizarCampo("endereco", evento.target.value)}
                  erro={erros.endereco}
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  rotulo="Descrição"
                  value={valores.descricao}
                  onChange={(evento) => atualizarCampo("descricao", evento.target.value)}
                  erro={erros.descricao}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-slate-900">Identidade visual do orçamento</h2>
            <p className="mt-1 text-sm text-slate-500">
              Aparecem no cabeçalho do documento que seu cliente recebe.
            </p>

            <div className="mt-4 flex flex-col gap-4">
              <Input
                rotulo="URL do logotipo"
                placeholder="https://..."
                value={valores.logoUrl}
                onChange={(evento) => atualizarCampo("logoUrl", evento.target.value)}
                erro={erros.logoUrl}
              />

              <div className="flex gap-6">
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="cor-primaria">
                    Cor principal
                  </label>
                  <input
                    id="cor-primaria"
                    type="color"
                    value={valores.corPrimaria}
                    onChange={(evento) =>
                      setValores((atual) => ({ ...atual, corPrimaria: evento.target.value }))
                    }
                    className="mt-1.5 block h-10 w-16 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="cor-secundaria">
                    Cor secundária
                  </label>
                  <input
                    id="cor-secundaria"
                    type="color"
                    value={valores.corSecundaria}
                    onChange={(evento) =>
                      setValores((atual) => ({ ...atual, corSecundaria: evento.target.value }))
                    }
                    className="mt-1.5 block h-10 w-16 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-slate-900">Ajuda</h2>
            <p className="mt-1 text-sm text-slate-500">
              Quer rever as dicas de como configurar sua empresa, cadastrar produtos e criar
              orçamentos?
            </p>
            <div className="mt-3">
              <Button type="button" variante="secundario" onClick={() => setMostrarOnboarding(true)}>
                Rever tour de boas-vindas
              </Button>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" carregando={salvando}>
              Salvar configurações
            </Button>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Prévia do orçamento
            </p>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 p-5">
                {valores.logoUrl ? (
                  <img
                    src={valores.logoUrl}
                    alt="Pré-visualização do logotipo"
                    className="h-10 w-10 rounded-lg border border-slate-200 object-contain"
                  />
                ) : (
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold text-white"
                    style={{ backgroundColor: valores.corPrimaria }}
                  >
                    {(valores.nome || "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-semibold"
                    style={{ color: valores.corPrimaria }}
                  >
                    {valores.nome || "Nome da sua empresa"}
                  </p>
                  <p className="text-xs text-slate-500">Orçamento #001</p>
                </div>
              </div>
              <div className="space-y-2 p-5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Serviço de exemplo</span>
                  <span>R$ 250,00</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold text-slate-900">
                  <span>Total</span>
                  <span>R$ 250,00</span>
                </div>
                <span
                  className="mt-3 inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-xs font-medium text-white"
                  style={{ backgroundColor: valores.corSecundaria }}
                >
                  Botão de destaque
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Prévia ilustrativa — os dados reais do orçamento vêm do que você cadastrar.
            </p>
          </div>
        </div>
      </form>

      {mostrarOnboarding && (
        <OnboardingWizard passoInicial={0} aoFechar={() => setMostrarOnboarding(false)} />
      )}
    </AppLayout>
  );
}
