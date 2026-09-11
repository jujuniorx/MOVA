import { CategoriaConfiguracoesLayout } from "../../components/configuracoes/CategoriaConfiguracoesLayout";
import { PerfilOperacionalCard } from "../../components/configuracoes/PerfilOperacionalCard";
import { PerfilTrabalhoCard } from "../../components/configuracoes/PerfilTrabalhoCard";

export function ConfiguracoesNegocioPage() {
  return (
    <CategoriaConfiguracoesLayout
      titulo="Como meu negócio funciona"
      descricao="Conte ao MOVA o que sua empresa faz e como você trabalha — isso ajuda a sugerir recursos e prioridades mais relevantes para você."
    >
      <PerfilOperacionalCard />
      <PerfilTrabalhoCard />
    </CategoriaConfiguracoesLayout>
  );
}
