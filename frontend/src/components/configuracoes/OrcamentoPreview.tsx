import { useAuth } from "../../context/AuthContext";

/** Prévia de como o cliente recebe um orçamento — usa a identidade real já
 * salva da empresa (logo/nome/cores), com um item ilustrativo de exemplo. */
export function OrcamentoPreview() {
  const { empresa } = useAuth();
  const cor = empresa?.corPrimaria || undefined;
  const corAcao = empresa?.corSecundaria || cor;

  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 bg-surface shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3 border-b border-ink-100 p-5">
        {empresa?.logoUrl ? (
          <img src={empresa.logoUrl} alt="Sua logo" className="h-10 w-10 rounded-lg border border-ink-200 object-contain" />
        ) : (
          <span
            className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: cor ?? "var(--color-brand-600)" }}
          >
            {(empresa?.nome || "?").charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" style={cor ? { color: cor } : undefined}>
            {empresa?.nome || "Nome da sua empresa"}
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
          style={{ backgroundColor: corAcao ?? "var(--color-brand-600)" }}
        >
          Botão de destaque
        </span>
      </div>
    </div>
  );
}
