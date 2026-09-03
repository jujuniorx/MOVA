import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ClientesPage } from "./pages/ClientesPage";
import { ProdutosPage } from "./pages/ProdutosPage";
import { NovoOrcamentoPage } from "./pages/NovoOrcamentoPage";
import { OrcamentoDetailPage } from "./pages/OrcamentoDetailPage";
import { PublicOrcamentoPage } from "./pages/PublicOrcamentoPage";
import { ConfiguracoesPage } from "./pages/ConfiguracoesPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registrar" element={<RegisterPage />} />
      <Route
        path="/painel"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes"
        element={
          <ProtectedRoute>
            <ClientesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/produtos"
        element={
          <ProtectedRoute>
            <ProdutosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orcamentos/novo"
        element={
          <ProtectedRoute>
            <NovoOrcamentoPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orcamentos/:id"
        element={
          <ProtectedRoute>
            <OrcamentoDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="/orcamentos/publico/:id" element={<PublicOrcamentoPage />} />
      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute>
            <ConfiguracoesPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
