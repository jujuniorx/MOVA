import { PaginaPublicaVisual } from "../publico/PaginaPublicaVisual";
import type { SitePersonalizacao } from "../../lib/sitePersonalizacao";
import { resolverUrlArquivo } from "../../lib/api";

interface ProdutoPreview {
  id: string;
  nome: string;
  descricao: string | null;
  imagemUrl: string | null;
  unidade: string | null;
  preco?: string;
}

interface MarcaESitePreviewProps {
  nome: string;
  descricao: string;
  logoUrl: string | null;
  corPrimaria: string;
  corSecundaria: string;
  telefone: string | null;
  whatsapp: string | null;
  endereco: string | null;
  exibirPrecos: boolean;
  produtos: ProdutoPreview[];
  personalizacao: SitePersonalizacao;
}

/**
 * Prévia ao vivo de como o site fica pro cliente — usa o MESMO componente
 * visual da página pública real (PaginaPublicaVisual), só dentro de uma
 * moldura menor com rolagem. Nenhuma implementação visual paralela: qualquer
 * mudança na vitrine real aparece igual aqui.
 */
export function MarcaESitePreview({
  nome,
  descricao,
  logoUrl,
  corPrimaria,
  corSecundaria,
  telefone,
  whatsapp,
  endereco,
  exibirPrecos,
  produtos,
  personalizacao,
}: MarcaESitePreviewProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 bg-ink-100 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-1.5 border-b border-ink-200 bg-surface px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
      </div>
      <div className="max-h-[560px] overflow-y-auto">
        <PaginaPublicaVisual
          empresa={{
            nome: nome || "Nome da sua empresa",
            descricao: descricao || null,
            corPrimaria,
            corSecundaria,
            telefone,
            whatsapp,
            endereco,
          }}
          logoUrl={resolverUrlArquivo(logoUrl)}
          produtos={produtos}
          exibirPrecos={exibirPrecos}
          personalizacao={personalizacao}
          modoPreview
        />
      </div>
    </div>
  );
}
