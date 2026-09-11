interface MarcaESitePreviewProps {
  nome: string;
  descricao: string;
  logoUrl: string | null;
  corPrimaria: string;
  corSecundaria: string;
}

/**
 * Prévia de como a empresa aparece pro cliente — atualiza na hora, sem
 * precisar salvar. É um mockup (não a página pública real embutida): a
 * arquitetura de rascunho pra espelhar exatamente a página ao vivo antes de
 * salvar seria complexidade desnecessária aqui; o layout é o mesmo da
 * vitrine real (ver PublicStorefrontPage), só compacto.
 */
export function MarcaESitePreview({ nome, descricao, logoUrl, corPrimaria, corSecundaria }: MarcaESitePreviewProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 bg-surface shadow-[var(--shadow-card)]">
      <div
        className="flex flex-col items-center gap-3 px-6 py-10 text-center"
        style={{ backgroundImage: `linear-gradient(180deg, ${corPrimaria}14, transparent 70%)` }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Sua logo"
            className="h-16 w-16 rounded-2xl border border-ink-200 bg-surface object-contain shadow-[var(--shadow-card)]"
          />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-[var(--shadow-card)]"
            style={{ backgroundColor: corPrimaria }}
          >
            {(nome || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <p className="text-lg font-bold tracking-tight" style={{ color: corPrimaria }}>
          {nome || "Nome da sua empresa"}
        </p>
        {descricao && <p className="max-w-xs text-sm text-ink-600">{descricao}</p>}
        <span
          className="mt-1 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: corSecundaria }}
        >
          Ver produtos e serviços
        </span>
      </div>
    </div>
  );
}
