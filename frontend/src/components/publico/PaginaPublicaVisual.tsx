import type { CSSProperties, ReactNode } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { LogoSimbolo } from "../Logo";
import {
  TOKENS_POR_ESTILO,
  comPadroes,
  secaoVisivel,
  corDeTextoContrastante,
  type SitePersonalizacao,
} from "../../lib/sitePersonalizacao";
import { montarLinkChat } from "../../lib/whatsapp";

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

function IconeRelogio({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3.5 2" />
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

function IconeCheck({ className = "h-4 w-4 shrink-0", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function LinkOuSpan({
  href,
  modoPreview,
  className,
  children,
}: {
  href: string | null;
  modoPreview: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (modoPreview || !href) return <span className={className}>{children}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

function IconeInstagram({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconeFacebook({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 8.5h-1.5A1.5 1.5 0 0011 10v2m0 0H9.5M11 12v6" />
    </svg>
  );
}

function IconeTikTok({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 4v10.5a3 3 0 11-2.5-2.96M14 4a4.5 4.5 0 004.5 4.5" />
    </svg>
  );
}

export interface PaginaPublicaVisualProps {
  empresa: {
    nome: string;
    descricao: string | null;
    corPrimaria: string | null;
    corSecundaria: string | null;
    telefone: string | null;
    whatsapp: string | null;
    endereco: string | null;
  };
  logoUrl: string | null;
  produtos: { id: string; nome: string; descricao: string | null; imagemUrl: string | null; unidade: string | null; preco?: string }[];
  exibirPrecos: boolean;
  personalizacao: SitePersonalizacao | null;
  /** Prévia dentro de Configurações: sem navegação/links reais e com estados vazios explicativos em vez de esconder seções sem dado. */
  modoPreview?: boolean;
  aoClicarProduto?: (produtoId: string) => void;
}

/**
 * Conteúdo visual completo da página pública — a MESMA estrutura é usada
 * pela vitrine real (PublicStorefrontPage) e pela prévia ao vivo em "Minha
 * marca e meu site" (MarcaESitePreview), para nunca haver duas
 * implementações visuais divergentes da mesma página.
 */
export function PaginaPublicaVisual({
  empresa,
  logoUrl,
  produtos,
  exibirPrecos,
  personalizacao,
  modoPreview = false,
  aoClicarProduto,
}: PaginaPublicaVisualProps) {
  const p = comPadroes(personalizacao);
  const tokens = TOKENS_POR_ESTILO[p.estilo];

  const cor = empresa.corPrimaria ?? undefined;
  const corAcao = empresa.corSecundaria ?? cor;
  const textoAcao = corDeTextoContrastante(corAcao ?? "#167b73");
  const estiloAcao = corAcao ? { backgroundColor: corAcao, color: textoAcao } : undefined;

  const temContatoBasico = Boolean(empresa.telefone || empresa.endereco || empresa.whatsapp);
  const temRedes = Boolean(p.redesSociais?.instagram || p.redesSociais?.facebook || p.redesSociais?.tiktok);
  const temContato = temContatoBasico || Boolean(p.horarioAtendimento) || temRedes;
  const linkWhatsapp = empresa.whatsapp ? montarLinkChat(empresa.whatsapp) : null;

  const mostrarProdutos = secaoVisivel("produtos", p.secoesAtivas, produtos.length > 0, modoPreview);
  const mostrarSobre = secaoVisivel("sobre", p.secoesAtivas, Boolean(p.sobreTexto?.trim()), modoPreview);
  const mostrarDiferenciais = secaoVisivel("diferenciais", p.secoesAtivas, Boolean(p.diferenciais && p.diferenciais.length > 0), modoPreview);
  const mostrarContato = secaoVisivel("contato", p.secoesAtivas, temContato, modoPreview);

  return (
    <div className={`min-h-full bg-ink-50 ${p.tema === "escuro" ? "dark" : "tema-claro-forcado"}`}>
      {/* CABEÇALHO / HERO — identidade da empresa em primeiro plano */}
      <header
        className="border-b border-ink-200 bg-surface"
        style={cor ? { backgroundImage: `linear-gradient(180deg, ${cor}14, transparent 65%)` } : undefined}
      >
        <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-14 text-center sm:py-20">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={empresa.nome}
              className={`h-20 w-20 border border-ink-200 bg-surface object-contain ${tokens.sombraCard} ${tokens.radiusCard} sm:h-24 sm:w-24`}
            />
          ) : (
            <div
              className={`flex h-20 w-20 items-center justify-center text-3xl font-bold ${tokens.sombraCard} ${tokens.radiusCard} sm:h-24 sm:w-24`}
              style={{ backgroundColor: cor ?? "var(--color-brand-600)", color: corDeTextoContrastante(cor ?? "#167b73") }}
            >
              {(empresa.nome || "?").charAt(0).toUpperCase()}
            </div>
          )}

          <h1 className={`mt-5 text-ink-900 ${tokens.tituloClasse}`} style={cor ? { color: cor } : undefined}>
            {empresa.nome || "Nome da sua empresa"}
          </h1>

          {empresa.descricao && <p className="mt-3 max-w-md text-base text-ink-600">{empresa.descricao}</p>}

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            {mostrarProdutos ? (
              <a href={modoPreview ? undefined : "#catalogo"} className="w-full sm:w-auto">
                <Button tamanho="lg" className={`w-full sm:w-auto ${tokens.radiusBotao} ${tokens.botaoPeso}`} style={estiloAcao}>
                  Ver produtos e serviços
                </Button>
              </a>
            ) : (
              linkWhatsapp && (
                <LinkOuSpan href={linkWhatsapp} modoPreview={modoPreview} className="w-full sm:w-auto">
                  <Button variante="whatsapp" tamanho="lg" className={`w-full sm:w-auto ${tokens.radiusBotao} ${tokens.botaoPeso}`}>
                    Falar no WhatsApp
                  </Button>
                </LinkOuSpan>
              )
            )}
          </div>
        </div>
      </header>

      {/* PRODUTOS / SERVIÇOS */}
      {mostrarProdutos && (
        <section id="catalogo" className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="mb-8 text-center sm:text-left">
            <h2 className="text-xl font-bold text-ink-900 sm:text-2xl">Produtos e serviços</h2>
            <p className="mt-1 text-sm text-ink-500">Escolha um item para solicitar um orçamento.</p>
          </div>

          {produtos.length === 0 ? (
            <EmptyState
              icone={<IconeCatalogo />}
              titulo={modoPreview ? "Seus produtos com \"Exibir na página pública\" aparecem aqui." : "Nenhum produto ou serviço divulgado no momento."}
              descricao={modoPreview ? "Marque essa opção na tela Produtos para eles aparecerem na vitrine." : "Fale diretamente com a empresa pelos dados de contato abaixo."}
            />
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {produtos.map((produto) => (
                <li key={produto.id}>
                  <Card className={`flex h-full flex-col gap-3 p-5 ${tokens.radiusCard} ${tokens.bordaCard} ${tokens.sombraCard}`}>
                    {produto.imagemUrl && (
                      <img
                        src={produto.imagemUrl}
                        alt={produto.nome}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                        className={`h-36 w-full object-cover ${tokens.radiusCard}`}
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-ink-900">{produto.nome}</p>
                      {produto.descricao && <p className="mt-1 text-sm text-ink-500">{produto.descricao}</p>}
                    </div>
                    {exibirPrecos && produto.preco && (
                      <p className="text-lg font-bold text-ink-900" style={cor ? { color: cor } : undefined}>
                        {formatoMoeda.format(Number(produto.preco))}
                        {produto.unidade ? <span className="text-sm font-medium text-ink-500"> / {produto.unidade}</span> : ""}
                      </p>
                    )}
                    <Button
                      className={`mt-auto w-full ${tokens.radiusBotao} ${tokens.botaoPeso}`}
                      style={estiloAcao}
                      onClick={() => aoClicarProduto?.(produto.id)}
                    >
                      Solicitar orçamento
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* SOBRE */}
      {mostrarSobre && (
        <section className="border-t border-ink-200 bg-surface">
          <div className="mx-auto max-w-2xl px-4 py-14 text-center sm:px-6">
            <h2 className="text-lg font-bold text-ink-900">Sobre a empresa</h2>
            {p.sobreTexto ? (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-600">{p.sobreTexto}</p>
            ) : (
              <p className="mt-4 text-sm text-ink-400">Conte a história do seu negócio em "Minha marca e meu site".</p>
            )}
          </div>
        </section>
      )}

      {/* DIFERENCIAIS */}
      {mostrarDiferenciais && (
        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-lg font-bold text-ink-900 sm:text-left">Diferenciais</h2>
          {p.diferenciais && p.diferenciais.length > 0 ? (
            <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {p.diferenciais.map((item, indice) => (
                <li key={indice} className={`flex items-start gap-2.5 p-4 text-sm text-ink-700 ${tokens.radiusCard} ${tokens.bordaCard} ${tokens.sombraCard}`}>
                  <IconeCheck className="mt-0.5 h-4 w-4 shrink-0" style={cor ? { color: cor } : undefined} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-center text-sm text-ink-400 sm:text-left">Liste o que diferencia seu negócio em "Minha marca e meu site".</p>
          )}
        </section>
      )}

      {/* CONTATO */}
      {mostrarContato && (
        <section className="border-t border-ink-200 bg-surface">
          <div className="mx-auto max-w-xl px-4 py-14 text-center sm:px-6">
            <h2 className="text-lg font-bold text-ink-900">Contato</h2>
            {modoPreview && !temContato && (
              <p className="mt-3 text-sm text-ink-400">Adicione telefone, endereço, horário ou redes sociais para aparecerem aqui.</p>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-600">
              {empresa.telefone && (
                <span className="inline-flex items-center gap-1.5">
                  <IconeTelefone />
                  {empresa.telefone}
                </span>
              )}
              {empresa.endereco && (
                <span className="inline-flex items-center gap-1.5">
                  <IconeLocal />
                  {empresa.endereco}
                </span>
              )}
              {p.horarioAtendimento && (
                <span className="inline-flex items-center gap-1.5">
                  <IconeRelogio />
                  {p.horarioAtendimento}
                </span>
              )}
            </div>

            {temRedes && (
              <div className="mt-5 flex justify-center gap-4 text-ink-500">
                {p.redesSociais?.instagram && (
                  <LinkOuSpan href={p.redesSociais.instagram} modoPreview={modoPreview} className="transition-colors hover:text-ink-900">
                    <span aria-label="Instagram"><IconeInstagram /></span>
                  </LinkOuSpan>
                )}
                {p.redesSociais?.facebook && (
                  <LinkOuSpan href={p.redesSociais.facebook} modoPreview={modoPreview} className="transition-colors hover:text-ink-900">
                    <span aria-label="Facebook"><IconeFacebook /></span>
                  </LinkOuSpan>
                )}
                {p.redesSociais?.tiktok && (
                  <LinkOuSpan href={p.redesSociais.tiktok} modoPreview={modoPreview} className="transition-colors hover:text-ink-900">
                    <span aria-label="TikTok"><IconeTikTok /></span>
                  </LinkOuSpan>
                )}
              </div>
            )}

            {linkWhatsapp && (
              <LinkOuSpan href={linkWhatsapp} modoPreview={modoPreview} className="mt-6 inline-block">
                <Button variante="whatsapp" tamanho="lg" className={`${tokens.radiusBotao} ${tokens.botaoPeso}`}>
                  Falar no WhatsApp
                </Button>
              </LinkOuSpan>
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
    </div>
  );
}
