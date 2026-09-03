import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";

export function HomePage() {
  const { usuario, empresa } = useAuth();

  return (
    <AppLayout>
      <Card>
        <h1 className="text-xl font-semibold text-slate-900">Bem-vindo, {usuario?.nome}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Você está conectado à empresa <span className="font-medium">{empresa?.nome}</span>.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          O painel de orçamentos será construído nas próximas etapas.
        </p>
      </Card>
    </AppLayout>
  );
}
