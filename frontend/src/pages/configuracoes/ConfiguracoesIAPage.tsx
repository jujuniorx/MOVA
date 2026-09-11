import { CategoriaConfiguracoesLayout } from "../../components/configuracoes/CategoriaConfiguracoesLayout";
import { MemoriaEmpresaCard } from "../../components/configuracoes/MemoriaEmpresaCard";

export function ConfiguracoesIAPage() {
  return (
    <CategoriaConfiguracoesLayout
      titulo="Inteligência do MOVA"
      descricao="A IA usa isso para criar sugestões e mensagens do jeito da sua empresa — ela não toma decisões importantes sozinha."
    >
      <MemoriaEmpresaCard />
    </CategoriaConfiguracoesLayout>
  );
}
