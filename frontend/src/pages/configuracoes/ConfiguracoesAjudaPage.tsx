import { useState } from "react";
import { CategoriaConfiguracoesLayout } from "../../components/configuracoes/CategoriaConfiguracoesLayout";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { OnboardingWizard } from "../../components/onboarding/OnboardingWizard";

export function ConfiguracoesAjudaPage() {
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false);

  return (
    <CategoriaConfiguracoesLayout titulo="Ajuda" descricao="Tutoriais e orientação para usar o MOVA.">
      <Card>
        <CardHeader titulo="Não sabe por onde começar?" descricao="Reveja o tour de boas-vindas com os passos essenciais para configurar sua empresa." />
        <div className="mt-3">
          <Button type="button" variante="secundario" onClick={() => setMostrarOnboarding(true)}>
            Ver tour de boas-vindas
          </Button>
        </div>
      </Card>

      {mostrarOnboarding && <OnboardingWizard passoInicial={0} aoFechar={() => setMostrarOnboarding(false)} />}
    </CategoriaConfiguracoesLayout>
  );
}
