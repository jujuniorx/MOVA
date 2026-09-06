import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { Card, CardHeader } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { PageHeader } from "../components/ui/PageHeader";
import { OnboardingWizard } from "../components/onboarding/OnboardingWizard";
import { PaginaPublicaCard } from "../components/configuracoes/PaginaPublicaCard";
import { IntegracoesCard } from "../components/configuracoes/IntegracoesCard";
import { CamposClienteCard } from "../components/configuracoes/CamposClienteCard";
import { MemoriaEmpresaCard } from "../components/configuracoes/MemoriaEmpresaCard";
import { PerfilTrabalhoCard } from "../components/configuracoes/PerfilTrabalhoCard";
import { PerfilOperacionalCard } from "../components/configuracoes/PerfilOperacionalCard";
import { ProcessoOrcamentoCard } from "../components/configuracoes/ProcessoOrcamentoCard";
import { ModulosCard } from "../components/configuracoes/ModulosCard";
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
      <PageHeader
        titulo="Personalize sua empresa"
        subtitulo="Essas informações aparecem nos orçamentos enviados aos seus clientes — é a identidade da sua empresa, não do MOVA."
      />

      <form className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3" onSubmit={aoEnviar} noValidate>
        <div className="flex flex-col gap-6 lg:col-span-2">
          {erroGeral && <Alert tipo="erro">{erroGeral}</Alert>}
          {sucesso && <Alert tipo="sucesso">Configurações salvas com sucesso.</Alert>}

          <Card>
            <CardHeader titulo="Minha empresa" descricao="Nome e contato usados para falar com seus clientes." />
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
              <Input
                rotulo="WhatsApp"
                type="tel"
                inputMode="tel"
                placeholder="(11) 91234-5678"
                dica="Usado no botão de compartilhar orçamentos."
                value={valores.whatsapp}
                onChange={(evento) => atualizarCampo("whatsapp", formatarTelefone(evento.target.value))}
                erro={erros.whatsapp}
              />
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
            <CardHeader
              titulo="Aparência"
              descricao="Logo e cores que aparecem no cabeçalho dos orçamentos enviados aos clientes."
            />

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
                  <label className="text-sm font-medium text-ink-700" htmlFor="cor-primaria">
                    Cor principal
                  </label>
                  <input
                    id="cor-primaria"
                    type="color"
                    value={valores.corPrimaria}
                    onChange={(evento) =>
                      setValores((atual) => ({ ...atual, corPrimaria: evento.target.value }))
                    }
                    className="mt-1.5 block h-10 w-16 rounded-lg border border-ink-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-700" htmlFor="cor-secundaria">
                    Cor secundária
                  </label>
                  <input
                    id="cor-secundaria"
                    type="color"
                    value={valores.corSecundaria}
                    onChange={(evento) =>
                      setValores((atual) => ({ ...atual, corSecundaria: evento.target.value }))
                    }
                    className="mt-1.5 block h-10 w-16 rounded-lg border border-ink-200"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              titulo="Plano e indicação"
              descricao={`Você está no plano ${empresa?.planoTipo === "GRATUITO" ? "gratuito" : empresa?.planoTipo}. Veja os planos disponíveis ou indique o MOVA para outras empresas.`}
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <Link to="/planos">
                <Button type="button" variante="secundario">
                  Ver planos
                </Button>
              </Link>
              <Link to="/indicacao">
                <Button type="button" variante="secundario">
                  Indicar o MOVA
                </Button>
              </Link>
            </div>
          </Card>

          <PerfilOperacionalCard />

          <ModulosCard />

          <PaginaPublicaCard />

          <ProcessoOrcamentoCard />

          <CamposClienteCard />

          <MemoriaEmpresaCard />

          <PerfilTrabalhoCard />

          <IntegracoesCard />

          <Card>
            <CardHeader titulo="Ajuda" descricao="Reveja as dicas de como configurar sua empresa, cadastrar produtos e criar orçamentos." />
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
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
              Como o cliente vê seu orçamento
            </p>
            <div className="overflow-hidden rounded-xl border border-ink-200 bg-surface shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3 border-b border-ink-100 p-5">
                {valores.logoUrl ? (
                  <img
                    src={valores.logoUrl}
                    alt="Pré-visualização do logotipo"
                    className="h-10 w-10 rounded-lg border border-ink-200 object-contain"
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
                  <p className="truncate text-sm font-semibold" style={{ color: valores.corPrimaria }}>
                    {valores.nome || "Nome da sua empresa"}
                  </p>
                  <p className="text-xs text-ink-500">Orçamento #001</p>
                </div>
              </div>
              <div className="space-y-2 p-5">
                <div className="flex justify-between text-xs text-ink-500">
                  <span>Serviço de exemplo</span>
                  <span>R$ 250,00</span>
                </div>
                <div className="flex justify-between border-t border-ink-100 pt-2 text-sm font-semibold text-ink-900">
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
            <p className="mt-2 text-xs text-ink-400">
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
