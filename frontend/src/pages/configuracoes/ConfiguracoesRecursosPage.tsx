import { CategoriaConfiguracoesLayout } from "../../components/configuracoes/CategoriaConfiguracoesLayout";
import { ModulosCard } from "../../components/configuracoes/ModulosCard";

export function ConfiguracoesRecursosPage() {
  return (
    <CategoriaConfiguracoesLayout
      titulo="Recursos do MOVA"
      descricao="Escolha quais recursos fazem sentido para o seu negócio. Você pode mudar isso quando quiser — desativar nunca apaga nenhum dado."
    >
      <ModulosCard />
    </CategoriaConfiguracoesLayout>
  );
}
