import { Link } from "react-router-dom";
import { CategoriaConfiguracoesLayout } from "../../components/configuracoes/CategoriaConfiguracoesLayout";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";

export function ConfiguracoesPlanoPage() {
  const { empresa } = useAuth();

  return (
    <CategoriaConfiguracoesLayout titulo="Plano e indicações" descricao="Seu plano atual e o programa de indicação do MOVA.">
      <Card>
        <CardHeader
          titulo="Plano atual"
          descricao={`Você está no plano ${empresa?.planoTipo === "GRATUITO" ? "gratuito" : empresa?.planoTipo}.`}
        />
        <div className="mt-3 flex flex-wrap gap-3">
          <Link to="/planos">
            <Button type="button">Ver planos</Button>
          </Link>
          <Link to="/indicacao">
            <Button type="button" variante="secundario">
              Indicar o MOVA
            </Button>
          </Link>
        </div>
      </Card>
    </CategoriaConfiguracoesLayout>
  );
}
