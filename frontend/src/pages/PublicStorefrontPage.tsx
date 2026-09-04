import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert } from "../components/ui/Alert";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { SolicitarOrcamentoModal } from "../components/publico/SolicitarOrcamentoModal";
import { ApiError, publicoApi } from "../lib/api";
import type { PaginaPublicaEmpresa } from "../lib/api";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

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

  if (carregando) {
    return (
      <div className="min-h-svh bg-ink-50 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (erro || !pagina) {
    return (
      <div className="min-h-svh bg-ink-50 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Alert tipo="erro">{erro ?? "Página não encontrada."}</Alert>
        </div>
      </div>
    );
  }

  const cor = pagina.empresa.corPrimaria ?? undefined;

  return (
    <div className="min-h-svh bg-ink-50">
      <div className="border-b border-ink-200 bg-surface px-4 py-10 sm:py-14">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          {pagina.empresa.logoUrl ? (
            <img src={pagina.empresa.logoUrl} alt={pagina.empresa.nome} className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl text-xl font-bold text-white" style={{ backgroundColor: cor ?? "#167b73" }}>
              {pagina.empresa.nome.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="mt-4 text-2xl font-bold text-ink-900">{pagina.empresa.nome}</h1>
          {pagina.empresa.descricao && <p className="mt-2 max-w-xl text-sm text-ink-600">{pagina.empresa.descricao}</p>}

          <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm text-ink-500">
            {pagina.empresa.telefone && <span>📞 {pagina.empresa.telefone}</span>}
            {pagina.empresa.endereco && <span>📍 {pagina.empresa.endereco}</span>}
          </div>

          {pagina.empresa.whatsapp && (
            <a
              href={`https://wa.me/${pagina.empresa.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#128C4A] px-5 text-sm font-semibold text-white hover:bg-[#0f7a40]"
            >
              Falar no WhatsApp
            </a>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
        {pagina.produtos.length === 0 ? (
          <p className="text-center text-sm text-ink-500">Nenhum produto ou serviço divulgado no momento.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {pagina.produtos.map((produto) => (
              <li key={produto.id}>
                <Card className="flex h-full flex-col gap-2">
                  {produto.imagemUrl && (
                    <img src={produto.imagemUrl} alt={produto.nome} className="mb-2 h-32 w-full rounded-lg object-cover" />
                  )}
                  <p className="font-medium text-ink-900">{produto.nome}</p>
                  {produto.descricao && <p className="text-sm text-ink-500">{produto.descricao}</p>}
                  {pagina.exibirPrecos && produto.preco && (
                    <p className="pt-2 text-sm font-semibold text-ink-900">
                      {formatoMoeda.format(Number(produto.preco))}
                      {produto.unidade ? ` / ${produto.unidade}` : ""}
                    </p>
                  )}
                  <Button tamanho="sm" variante="secundario" className="mt-auto" onClick={() => setProdutoSelecionadoId(produto.id)}>
                    Solicitar orçamento
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="pb-8 text-center text-xs text-ink-400">Página criada com MOVA</p>

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
