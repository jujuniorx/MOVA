import { useEffect, useState } from "react";
import { CategoriaConfiguracoesLayout } from "../../components/configuracoes/CategoriaConfiguracoesLayout";
import { Card, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { LogoUploadField } from "../../components/configuracoes/LogoUploadField";
import { SeletorCor } from "../../components/configuracoes/SeletorCor";
import { MarcaESitePreview } from "../../components/configuracoes/MarcaESitePreview";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ApiError, empresaApi } from "../../lib/api";

const COR_PRIMARIA_PADRAO = "#167b73";
const COR_SECUNDARIA_PADRAO = "#167b73";
const REGEX_HEX = /^#[0-9A-Fa-f]{6}$/;

export function ConfiguracoesMarcaPage() {
  const { empresa, atualizarEmpresa } = useAuth();
  const { mostrarSucesso } = useToast();

  const [corPrimaria, setCorPrimaria] = useState(empresa?.corPrimaria || COR_PRIMARIA_PADRAO);
  const [corSecundaria, setCorSecundaria] = useState(empresa?.corSecundaria || COR_SECUNDARIA_PADRAO);
  const [salvandoCores, setSalvandoCores] = useState(false);
  const [erroCores, setErroCores] = useState<string | null>(null);

  const [ativa, setAtiva] = useState(empresa?.paginaPublicaAtiva ?? false);
  const [slug, setSlug] = useState(empresa?.slugPublico ?? "");
  const [exibirPrecos, setExibirPrecos] = useState(empresa?.exibirPrecosPublico ?? true);
  const [salvandoPagina, setSalvandoPagina] = useState(false);
  const [erroPagina, setErroPagina] = useState<string | null>(null);

  useEffect(() => {
    if (!empresa) return;
    setCorPrimaria(empresa.corPrimaria || COR_PRIMARIA_PADRAO);
    setCorSecundaria(empresa.corSecundaria || COR_SECUNDARIA_PADRAO);
    setAtiva(empresa.paginaPublicaAtiva);
    setSlug(empresa.slugPublico ?? "");
    setExibirPrecos(empresa.exibirPrecosPublico);
  }, [empresa]);

  async function salvarCores() {
    setErroCores(null);
    if (!REGEX_HEX.test(corPrimaria) || !REGEX_HEX.test(corSecundaria)) {
      setErroCores("Escolha cores válidas antes de salvar.");
      return;
    }
    setSalvandoCores(true);
    try {
      const atualizada = await empresaApi.atualizar({ corPrimaria, corSecundaria });
      atualizarEmpresa(atualizada);
      mostrarSucesso("Alterações salvas.");
    } catch (e) {
      setErroCores(e instanceof ApiError ? e.message : "Não foi possível salvar as cores agora.");
    } finally {
      setSalvandoCores(false);
    }
  }

  const paginaPublicada = Boolean(empresa?.paginaPublicaAtiva && empresa?.slugPublico);
  const urlPublicada = empresa?.slugPublico ? `${window.location.origin}/loja/${empresa.slugPublico}` : null;
  const urlEmEdicao = slug ? `${window.location.origin}/loja/${slug}` : null;

  async function copiarLink() {
    if (!urlPublicada) return;
    try {
      await navigator.clipboard.writeText(urlPublicada);
      mostrarSucesso("Link copiado.");
    } catch {
      setErroPagina("Não foi possível copiar o link. Copie manualmente.");
    }
  }

  async function salvarPaginaPublica() {
    setErroPagina(null);
    setSalvandoPagina(true);
    try {
      const atualizada = await empresaApi.atualizar({
        paginaPublicaAtiva: ativa,
        slugPublico: slug || undefined,
        exibirPrecosPublico: exibirPrecos,
      });
      atualizarEmpresa(atualizada);
      mostrarSucesso("Alterações salvas.");
    } catch (e) {
      setErroPagina(e instanceof ApiError ? e.message : "Não foi possível salvar agora.");
    } finally {
      setSalvandoPagina(false);
    }
  }

  return (
    <CategoriaConfiguracoesLayout
      titulo="Minha marca e meu site"
      descricao="Defina a identidade que seus clientes verão e acompanhe como sua página pública está ficando."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader titulo="Identidade visual" descricao="Logo e cores usadas nos orçamentos e na sua página pública." />
            <div className="mt-4 flex flex-col gap-5">
              {erroCores && <Alert tipo="erro">{erroCores}</Alert>}
              <LogoUploadField />
              <SeletorCor rotulo="Cor principal" valor={corPrimaria} aoAlterar={setCorPrimaria} />
              <SeletorCor rotulo="Cor de destaque (botões)" valor={corSecundaria} aoAlterar={setCorSecundaria} />
              <div>
                <Button type="button" onClick={salvarCores} carregando={salvandoCores}>
                  Salvar cores
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              titulo="Página pública"
              descricao="Esta é a página que seus clientes podem acessar sem fazer login, pra ver seus produtos e pedir orçamento."
            />
            <div className="mt-4 flex flex-col gap-4">
              {erroPagina && <Alert tipo="erro">{erroPagina}</Alert>}

              {paginaPublicada && urlPublicada ? (
                <div className="rounded-xl border border-success-200 bg-success-50 p-4">
                  <p className="text-sm font-medium text-success-800">Sua página pública está no ar</p>
                  <p className="mt-1 break-all text-sm text-success-700">{urlPublicada}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" tamanho="sm" variante="secundario" onClick={copiarLink}>
                      Copiar link
                    </Button>
                    <a href={urlPublicada} target="_blank" rel="noopener noreferrer">
                      <Button type="button" tamanho="sm">
                        Ver meu site
                      </Button>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
                  <p className="text-sm font-medium text-ink-700">Sua página pública ainda não está no ar</p>
                  <p className="mt-1 text-sm text-ink-500">Ative e escolha um endereço abaixo para publicar.</p>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
                <input
                  type="checkbox"
                  checked={ativa}
                  onChange={(e) => setAtiva(e.target.checked)}
                  className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                Ativar página pública
              </label>

              <Input
                rotulo="Endereço da página"
                placeholder="minha-empresa"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                dica={urlEmEdicao ?? "Escolha um endereço curto, sem espaços (ex: minha-empresa)."}
              />

              <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
                <input
                  type="checkbox"
                  checked={exibirPrecos}
                  onChange={(e) => setExibirPrecos(e.target.checked)}
                  className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                Exibir preços na página pública
              </label>

              <p className="text-xs text-ink-500">
                Marque "Exibir na página pública" em cada produto (na tela Produtos) para ele aparecer aqui.
              </p>

              <div>
                <Button type="button" onClick={salvarPaginaPublica} carregando={salvandoPagina}>
                  Salvar página pública
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Veja como seu site está ficando</p>
            <MarcaESitePreview
              nome={empresa?.nome ?? ""}
              descricao={empresa?.descricao ?? ""}
              logoUrl={empresa?.logoUrl ?? null}
              corPrimaria={corPrimaria}
              corSecundaria={corSecundaria}
            />
            <p className="mt-2 text-xs text-ink-400">
              Prévia ilustrativa das cores escolhidas. {urlPublicada ? "" : "Ative a página pública para ver o site de verdade."}
            </p>
            {urlPublicada && (
              <a href={urlPublicada} target="_blank" rel="noopener noreferrer" className="mt-3 block">
                <Button type="button" variante="secundario" className="w-full">
                  Ver meu site de verdade
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </CategoriaConfiguracoesLayout>
  );
}
