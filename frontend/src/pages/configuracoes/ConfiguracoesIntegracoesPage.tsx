import { CategoriaConfiguracoesLayout } from "../../components/configuracoes/CategoriaConfiguracoesLayout";
import { IntegracoesCard } from "../../components/configuracoes/IntegracoesCard";

export function ConfiguracoesIntegracoesPage() {
  return (
    <CategoriaConfiguracoesLayout titulo="Integrações" descricao="Conecte WhatsApp, Mercado Livre e outros serviços ao MOVA.">
      <IntegracoesCard />
    </CategoriaConfiguracoesLayout>
  );
}
