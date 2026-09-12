import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert } from "../components/ui/Alert";
import { Skeleton } from "../components/ui/Skeleton";
import { PaginaPublicaVisual } from "../components/publico/PaginaPublicaVisual";
import { SolicitarOrcamentoModal } from "../components/publico/SolicitarOrcamentoModal";
import { ApiError, publicoApi, resolverUrlArquivo } from "../lib/api";
import type { PaginaPublicaEmpresa } from "../lib/api";

export function PublicStorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const [pagina, setPagina] = useState<PaginaPublicaEmpresa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState<string | null>(null);

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
    const logoAbsoluta = resolverUrlArquivo(pagina.empresa.logoUrl);
    definirMeta("name", "twitter:card", logoAbsoluta ? "summary_large_image" : "summary");
    if (logoAbsoluta) {
      definirMeta("property", "og:image", logoAbsoluta);
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
    if (logoAbsoluta) dadosEstruturados.image = logoAbsoluta;
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

  return (
    <div className="min-h-svh">
      <PaginaPublicaVisual
        empresa={pagina.empresa}
        logoUrl={resolverUrlArquivo(pagina.empresa.logoUrl)}
        produtos={pagina.produtos}
        exibirPrecos={pagina.exibirPrecos}
        personalizacao={pagina.personalizacao}
        aoClicarProduto={setProdutoSelecionadoId}
      />

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
