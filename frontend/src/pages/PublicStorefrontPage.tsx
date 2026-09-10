import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert } from "../components/ui/Alert";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { LogoSimbolo } from "../components/Logo";
import { SolicitarOrcamentoModal } from "../components/publico/SolicitarOrcamentoModal";
import { ApiError, publicoApi } from "../lib/api";
import type { PaginaPublicaEmpresa } from "../lib/api";
import { montarLinkChat } from "../lib/whatsapp";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function IconeTelefone({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.97.76l1.2 4.8a1 1 0 01-.5 1.11l-1.7.85a12.05 12.05 0 006.5 6.5l.85-1.7a1 1 0 011.11-.5l4.8 1.2a1 1 0 01.76.97V19a2 2 0 01-2 2h-1C9.16 21 3 14.84 3 7V5z" />
    </svg>
  );
}

function IconeLocal({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-6.5 7-11.5A7 7 0 105 9.5C5 14.5 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconeCatalogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM4 7.5 12 12l8-4.5M12 12v9" />
    </svg>
  );
}

export function PublicStorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const [pagina, setPagina] = useState<PaginaPublicaEmpresa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState<string | null>(null);
  const [logoQuebrada, setLogoQuebrada] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setCarregando(true);
    publicoApi
      .obterPagina(slug)
      .then(setPagina)
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar esta página."))
      .finally(() => setCarregando(false));
  }, [slug]);

  // Título da aba reflete a empresa, não o app — importante para quem abre
  // várias abas e para o preview ao compartilhar o link (algumas plataformas
  // usam o <title> vigente como reserva quando não há Open Graph).
  useEffect(() => {
    const tituloAnterior = document.title;
    if (pagina) {
      document.title = `${pagina.empresa.nome} — Página criada com MOVA`;
    }
    return () => {
      document.title = tituloAnterior;
    };
  }, [pagina]);

  // SEO básico + preview ao compartilhar: como o MOVA é uma SPA sem
  // renderização no servidor, robôs de preview de link (WhatsApp, Facebook,
  // etc.) que não executam JavaScript não veem estas tags — isso exigiria
  // SSR, fora do escopo agora. Ainda assim vale a pena: ajuda o Google (que
  // executa JavaScript ao indexar) e deixa a página pronta para SSR futuro
  // sem precisar revisitar isto.
  useEffect(() => {
    if (!pagina) return;
    const descricaoConteudo =
      pagina.empresa.descricao?.trim() || `Confira os produtos e serviços de ${pagina.empresa.nome} e peça um orçamento.`;
    const tagsCriadas: HTMLElement[] = [];

    function definirMeta(atributo: "name" | "property", chave: string, conteudo: string) {
      let tag = document.head.querySelector<HTMLMetaElement>(`meta[${atributo}="${chave}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(atributo, chave);
        document.head.appendChild(tag);
        tagsCriadas.push(tag);
      }
      tag.setAttribute("content", conteudo);
    }

    definirMeta("name", "description", descricaoConteudo);
    definirMeta("property", "og:type", "website");
    definirMeta("property", "og:title", pagina.empresa.nome);
    definirMeta("property", "og:description", descricaoConteudo);
    definirMeta("property", "og:url", window.location.href);
    definirMeta("name", "twitter:card", pagina.empresa.logoUrl ? "summary_large_image" : "summary");
    if (pagina.empresa.logoUrl) {
      definirMeta("property", "og:image", pagina.empresa.logoUrl);
    }

    // O <link rel="canonical"> padrão (no index.html) aponta pra "/" — errado
    // aqui, onde cada slug é uma URL com conteúdo próprio. Ajusta enquanto a
    // vitrine está aberta e devolve o valor original ao sair da página.
    const linkCanonico = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const hrefOriginal = linkCanonico?.getAttribute("href") ?? null;
    linkCanonico?.setAttribute("href", window.location.href);

    // Dados estruturados (Schema.org) — só campos que a empresa realmente
    // cadastrou; nunca inventa endereço estruturado a partir de um campo de
    // texto livre nem preenche algo que não foi informado.
    const dadosEstruturados: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: pagina.empresa.nome,
      description: descricaoConteudo,
      url: window.location.href,
    };
    if (pagina.empresa.telefone) dadosEstruturados.telephone = pagina.empresa.telefone;
    if (pagina.empresa.logoUrl) dadosEstruturados.image = pagina.empresa.logoUrl;
    const scriptLd = document.createElement("script");
    scriptLd.type = "application/ld+json";
    scriptLd.textContent = JSON.stringify(dadosEstruturados);
    document.head.appendChild(scriptLd);

    return () => {
      tagsCriadas.forEach((tag) => tag.remove());
      scriptLd.remove();
      if (linkCanonico && hrefOriginal) linkCanonico.setAttribute("href", hrefOriginal);
    };
  }, [pagina]);

  if (carregando) {
    return (
      <div className="tema-claro-forcado min-h-svh bg-ink-50">
        <div className="border-b border-ink-200 bg-surface px-4 py-14 sm:py-20">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-2xl" />
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="mt-2 h-11 w-40" />
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        </div>
      </div>
    );
  }

  if (erro || !pagina) {
    return (
      <div className="tema-claro-forcado min-h-svh bg-ink-50 px-4 py-10">
        <div className="mx-auto max-w-lg pt-10">
          <Alert tipo="erro">{erro ?? "Página não encontrada."}</Alert>
        </div>
      </div>
    );
  }

  const cor = pagina.empresa.corPrimaria ?? undefined;
  // A cor de destaque dos botões usa a secundária; se a empresa não tiver
  // configurado uma, cai para a primária em vez de ficar sem nenhuma cor —
  // é o mesmo comportamento já previsto no preview de Configurações.
  const corAcao = pagina.empresa.corSecundaria ?? cor;
  const estiloAcao = corAcao ? { backgroundColor: corAcao, color: "#fff" } : undefined;
  const temContato = Boolean(pagina.empresa.telefone || pagina.empresa.endereco || pagina.empresa.whatsapp);
  const linkWhatsapp = pagina.empresa.whatsapp ? montarLinkChat(pagina.empresa.whatsapp) : null;

  return (
    <div className="tema-claro-forcado min-h-svh bg-ink-50">
      {/* CABEÇALHO / HERO — identidade da empresa em primeiro plano */}
      <header
        className="border-b border-ink-200 bg-surface"
        style={cor ? { backgroundImage: `linear-gradient(180deg, ${cor}14, transparent 65%)` } : undefined}
      >
        <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-14 text-center sm:py-20">
          {pagina.empresa.logoUrl && !logoQuebrada ? (
            <img
              src={pagina.empresa.logoUrl}
              alt={pagina.empresa.nome}
              onError={() => setLogoQuebrada(true)}
              className="h-20 w-20 rounded-2xl border border-ink-200 bg-surface object-contain shadow-[var(--shadow-card)] sm:h-24 sm:w-24"
            />
          ) : (
            <div
              className="flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold text-white shadow-[var(--shadow-card)] sm:h-24 sm:w-24"
              style={{ backgroundColor: cor ?? "var(--color-brand-600)" }}
            >
              {pagina.empresa.nome.charAt(0).toUpperCase()}
            </div>
          )}

          <h1
            className="mt-5 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl"
            style={cor ? { color: cor } : undefined}
          >
            {pagina.empresa.nome}
          </h1>

          {pagina.empresa.descricao && (
            <p className="mt-3 max-w-md text-base text-ink-600">{pagina.empresa.descricao}</p>
          )}

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            {pagina.produtos.length > 0 ? (
              <a href="#catalogo" className="w-full sm:w-auto">
                <Button tamanho="lg" className="w-full sm:w-auto" style={estiloAcao}>
                  Ver produtos e serviços
                </Button>
              </a>
            ) : (
              linkWhatsapp && (
                <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                  <Button variante="whatsapp" tamanho="lg" className="w-full sm:w-auto">
                    Falar no WhatsApp
                  </Button>
                </a>
              )
            )}
          </div>
        </div>
      </header>

      {/* PRODUTOS / SERVIÇOS */}
      <section id="catalogo" className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mb-8 text-center sm:text-left">
          <h2 className="text-xl font-bold text-ink-900 sm:text-2xl">Produtos e serviços</h2>
          <p className="mt-1 text-sm text-ink-500">Escolha um item para solicitar um orçamento.</p>
        </div>

        {pagina.produtos.length === 0 ? (
          <EmptyState
            icone={<IconeCatalogo />}
            titulo="Nenhum produto ou serviço divulgado no momento."
            descricao="Fale diretamente com a empresa pelos dados de contato abaixo."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pagina.produtos.map((produto) => (
              <li key={produto.id}>
                <Card className="flex h-full flex-col gap-3 p-5">
                  {produto.imagemUrl && (
                    <img
                      src={produto.imagemUrl}
                      alt={produto.nome}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      className="h-36 w-full rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-ink-900">{produto.nome}</p>
                    {produto.descricao && <p className="mt-1 text-sm text-ink-500">{produto.descricao}</p>}
                  </div>
                  {pagina.exibirPrecos && produto.preco && (
                    <p className="text-lg font-bold text-ink-900" style={cor ? { color: cor } : undefined}>
                      {formatoMoeda.format(Number(produto.preco))}
                      {produto.unidade ? <span className="text-sm font-medium text-ink-500"> / {produto.unidade}</span> : ""}
                    </p>
                  )}
                  <Button className="mt-auto w-full" style={estiloAcao} onClick={() => setProdutoSelecionadoId(produto.id)}>
                    Solicitar orçamento
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* CONTATO */}
      {temContato && (
        <section className="border-t border-ink-200 bg-surface">
          <div className="mx-auto max-w-xl px-4 py-14 text-center sm:px-6">
            <h2 className="text-lg font-bold text-ink-900">Contato</h2>
            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-600">
              {pagina.empresa.telefone && (
                <span className="inline-flex items-center gap-1.5">
                  <IconeTelefone />
                  {pagina.empresa.telefone}
                </span>
              )}
              {pagina.empresa.endereco && (
                <span className="inline-flex items-center gap-1.5">
                  <IconeLocal />
                  {pagina.empresa.endereco}
                </span>
              )}
            </div>

            {linkWhatsapp && (
              <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block">
                <Button variante="whatsapp" tamanho="lg">
                  Falar no WhatsApp
                </Button>
              </a>
            )}
          </div>
        </section>
      )}

      {/* RODAPÉ — marca do MOVA discreta, sem competir com a da empresa */}
      <footer className="px-4 py-8">
        <p className="flex items-center justify-center gap-1.5 text-xs text-ink-400">
          <LogoSimbolo className="w-4 text-ink-300" />
          Página criada com MOVA
        </p>
      </footer>

      {slug && (
        <SolicitarOrcamentoModal
          aberto={produtoSelecionadoId !== null}
          aoFechar={() => setProdutoSelecionadoId(null)}
          slug={slug}
          produtoId={produtoSelecionadoId}
        />
      )}
    </div>
  );
}
