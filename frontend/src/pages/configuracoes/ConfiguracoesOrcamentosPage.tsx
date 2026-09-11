import { CategoriaConfiguracoesLayout } from "../../components/configuracoes/CategoriaConfiguracoesLayout";
import { ProcessoOrcamentoCard } from "../../components/configuracoes/ProcessoOrcamentoCard";
import { CamposClienteCard } from "../../components/configuracoes/CamposClienteCard";
import { OrcamentoPreview } from "../../components/configuracoes/OrcamentoPreview";

export function ConfiguracoesOrcamentosPage() {
  return (
    <CategoriaConfiguracoesLayout
      titulo="Orçamentos"
      descricao="Configure como seus orçamentos funcionam: as etapas do seu processo e o que perguntar ao cliente."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ProcessoOrcamentoCard />
          <CamposClienteCard />
        </div>
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Veja como seu cliente recebe um orçamento</p>
            <OrcamentoPreview />
          </div>
        </div>
      </div>
    </CategoriaConfiguracoesLayout>
  );
}
