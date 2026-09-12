import { useEffect, useState } from "react";
import { CategoriaConfiguracoesLayout } from "../../components/configuracoes/CategoriaConfiguracoesLayout";
import { Card, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { LogoUploadField } from "../../components/configuracoes/LogoUploadField";
import { SeletorCor } from "../../components/configuracoes/SeletorCor";
import { MarcaESitePreview } from "../../components/configuracoes/MarcaESitePreview";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ApiError, empresaApi, produtosApi } from "../../lib/api";
import type { Produto } from "../../lib/api";
import { ESTILOS_SITE, SECOES_SITE } from "../../lib/sitePersonalizacao";
import type { EstiloSite, SecaoSite, TemaSite } from "../../lib/sitePersonalizacao";

const COR_PRIMARIA_PADRAO = "#167b73";
const COR_SECUNDARIA_PADRAO = "#167b73";
const REGEX_HEX = /^#[0-9A-Fa-f]{6}$/;
const MAX_DIFERENCIAIS = 6;
const TODAS_SECOES: SecaoSite[] = ["produtos", "sobre", "diferenciais", "contato"];

function pillClasse(ativo: boolean): string {
  return `inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
    ativo
      ? "border-brand-600 bg-brand-600 text-white"
      : "border-ink-200 bg-surface text-ink-600 hover:border-brand-300 hover:text-brand-700"
  }`;
}

export function ConfiguracoesMarcaPage() {
  const { empresa, atualizarEmpresa } = useAuth();
  const { mostrarSucesso } = useToast();

  const [corPrimaria, setCorPrimaria] = useState(empresa?.corPrimaria || COR_PRIMARIA_PADRAO);
  const [corSecundaria, setCorSecundaria] = useState(empresa?.corSecundaria || COR_SECUNDARIA_PADRAO);
  const [salvandoCores, setSalvandoCores] = useState(false);
  const [erroCores, setErroCores] = useState<string | null>(null);

  // Aparência e conteúdo do site — tudo isto vive junto em sitePersonalizacao.
  const [tema, setTema] = useState<TemaSite>("claro");
  const [estilo, setEstilo] = useState<EstiloSite>("moderno");
  const [sobreTexto, setSobreTexto] = useState("");
  const [diferenciais, setDiferenciais] = useState<string[]>([]);
  const [novoDiferencial, setNovoDiferencial] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [horarioAtendimento, setHorarioAtendimento] = useState("");
  const [secoesAtivas, setSecoesAtivas] = useState<SecaoSite[]>(TODAS_SECOES);
  const [salvandoAparencia, setSalvandoAparencia] = useState(false);
  const [erroAparencia, setErroAparencia] = useState<string | null>(null);

  const [ativa, setAtiva] = useState(empresa?.paginaPublicaAtiva ?? false);
  const [slug, setSlug] = useState(empresa?.slugPublico ?? "");
  const [exibirPrecos, setExibirPrecos] = useState(empresa?.exibirPrecosPublico ?? true);
  const [salvandoPagina, setSalvandoPagina] = useState(false);
  const [erroPagina, setErroPagina] = useState<string | null>(null);

  const [produtosPreview, setProdutosPreview] = useState<Produto[]>([]);

  useEffect(() => {
    if (!empresa) return;
    setCorPrimaria(empresa.corPrimaria || COR_PRIMARIA_PADRAO);
    setCorSecundaria(empresa.corSecundaria || COR_SECUNDARIA_PADRAO);
    setAtiva(empresa.paginaPublicaAtiva);
    setSlug(empresa.slugPublico ?? "");
    setExibirPrecos(empresa.exibirPrecosPublico);

    const p = empresa.sitePersonalizacao;
    setTema(p?.tema ?? "claro");
    setEstilo(p?.estilo ?? "moderno");
    setSobreTexto(p?.sobreTexto ?? "");
    setDiferenciais(p?.diferenciais ?? []);
    setInstagram(p?.redesSociais?.instagram ?? "");
    setFacebook(p?.redesSociais?.facebook ?? "");
    setTiktok(p?.redesSociais?.tiktok ?? "");
    setHorarioAtendimento(p?.horarioAtendimento ?? "");
    setSecoesAtivas(p?.secoesAtivas ?? TODAS_SECOES);
  }, [empresa]);

  useEffect(() => {
    produtosApi
      .listar(true)
      .then((lista) => setProdutosPreview(lista.filter((produto) => produto.exibirNaPaginaPublica)))
      .catch(() => setProdutosPreview([]));
  }, []);

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

  function adicionarDiferencial() {
    const texto = novoDiferencial.trim();
    if (!texto || diferenciais.length >= MAX_DIFERENCIAIS) return;
    setDiferenciais((atual) => [...atual, texto]);
    setNovoDiferencial("");
  }

  function removerDiferencial(indice: number) {
    setDiferenciais((atual) => atual.filter((_, i) => i !== indice));
  }

  function alternarSecao(id: SecaoSite) {
    setSecoesAtivas((atual) => (atual.includes(id) ? atual.filter((s) => s !== id) : [...atual, id]));
  }

  async function salvarAparencia() {
    setErroAparencia(null);
    setSalvandoAparencia(true);
    try {
      const atualizada = await empresaApi.atualizar({
        sitePersonalizacao: {
          tema,
          estilo,
          sobreTexto: sobreTexto.trim() || undefined,
          diferenciais,
          redesSociais: {
            instagram: instagram.trim() || undefined,
            facebook: facebook.trim() || undefined,
            tiktok: tiktok.trim() || undefined,
          },
          horarioAtendimento: horarioAtendimento.trim() || undefined,
          secoesAtivas,
        },
      });
      atualizarEmpresa(atualizada);
      mostrarSucesso("Aparência do site atualizada.");
    } catch (e) {
      setErroAparencia(e instanceof ApiError ? e.message : "Não foi possível salvar agora.");
    } finally {
      setSalvandoAparencia(false);
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
              titulo="Como seu site deve aparecer"
              descricao="Escolha o tema, o estilo e o que aparece na sua página pública."
            />
            <div className="mt-4 flex flex-col gap-6">
              {erroAparencia && <Alert tipo="erro">{erroAparencia}</Alert>}

              <div>
                <p className="text-sm font-medium text-ink-700">Tema</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setTema("claro")} className={pillClasse(tema === "claro")}>
                    Claro
                  </button>
                  <button type="button" onClick={() => setTema("escuro")} className={pillClasse(tema === "escuro")}>
                    Escuro
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-ink-700">Estilo visual</p>
                <p className="text-xs text-ink-500">Escolha o estilo que combina com sua empresa.</p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ESTILOS_SITE.map((item) => (
                    <button
                      key={item.valor}
                      type="button"
                      onClick={() => setEstilo(item.valor)}
                      aria-pressed={estilo === item.valor}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        estilo === item.valor
                          ? "border-brand-600 bg-brand-50"
                          : "border-ink-200 bg-surface hover:border-brand-300"
                      }`}
                    >
                      <p className="text-sm font-semibold text-ink-900">{item.rotulo}</p>
                      <p className="mt-0.5 text-xs text-ink-500">{item.descricao}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                rotulo="Sobre a empresa (opcional)"
                dica="Um texto curto contando a história ou a proposta do seu negócio."
                value={sobreTexto}
                onChange={(e) => setSobreTexto(e.target.value)}
                maxLength={1000}
              />

              <div>
                <p className="text-sm font-medium text-ink-700">Diferenciais (opcional)</p>
                <p className="text-xs text-ink-500">O que faz seu negócio se destacar — até {MAX_DIFERENCIAIS} itens curtos.</p>
                {diferenciais.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {diferenciais.map((item, indice) => (
                      <li key={indice} className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-700">
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => removerDiferencial(indice)}
                          aria-label={`Remover "${item}"`}
                          className="shrink-0 text-ink-400 hover:text-danger-600"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {diferenciais.length < MAX_DIFERENCIAIS && (
                  <div className="mt-2 flex items-end gap-2">
                    <Input
                      rotulo="Novo diferencial"
                      value={novoDiferencial}
                      onChange={(e) => setNovoDiferencial(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          adicionarDiferencial();
                        }
                      }}
                      placeholder="Ex.: entrega rápida, atendimento personalizado..."
                      className="flex-1"
                    />
                    <Button type="button" variante="secundario" onClick={adicionarDiferencial} disabled={!novoDiferencial.trim()}>
                      Adicionar
                    </Button>
                  </div>
                )}
              </div>

              <Input
                rotulo="Horário de atendimento (opcional)"
                value={horarioAtendimento}
                onChange={(e) => setHorarioAtendimento(e.target.value)}
                placeholder="Ex.: Seg a sex, 9h às 18h"
              />

              <div>
                <p className="text-sm font-medium text-ink-700">Redes sociais (opcional)</p>
                <div className="mt-2 flex flex-col gap-3">
                  <Input
                    rotulo="Instagram"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="https://instagram.com/suaempresa"
                  />
                  <Input
                    rotulo="Facebook"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    placeholder="https://facebook.com/suaempresa"
                  />
                  <Input
                    rotulo="TikTok"
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    placeholder="https://tiktok.com/@suaempresa"
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-ink-700">O que aparece no seu site</p>
                <p className="text-xs text-ink-500">Desmarque o que não fizer sentido mostrar agora.</p>
                <div className="mt-2 flex flex-col gap-2">
                  {SECOES_SITE.map((secao) => (
                    <label key={secao.valor} className="flex items-center gap-2 text-sm text-ink-700">
                      <input
                        type="checkbox"
                        checked={secoesAtivas.includes(secao.valor)}
                        onChange={() => alternarSecao(secao.valor)}
                        className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                      />
                      {secao.rotulo}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Button type="button" onClick={salvarAparencia} carregando={salvandoAparencia}>
                  Salvar aparência
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
              telefone={empresa?.telefone ?? null}
              whatsapp={empresa?.whatsapp ?? null}
              endereco={empresa?.endereco ?? null}
              exibirPrecos={exibirPrecos}
              produtos={produtosPreview}
              personalizacao={{
                tema,
                estilo,
                sobreTexto,
                diferenciais,
                redesSociais: { instagram, facebook, tiktok },
                horarioAtendimento,
                secoesAtivas,
              }}
            />
            <p className="mt-2 text-xs text-ink-400">
              Prévia ao vivo — reflete suas alterações antes mesmo de salvar. {urlPublicada ? "" : "Ative a página pública para ter um link de verdade."}
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
