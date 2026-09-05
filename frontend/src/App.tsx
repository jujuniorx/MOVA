import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { EsqueciSenhaPage } from "./pages/EsqueciSenhaPage";
import { RedefinirSenhaPage } from "./pages/RedefinirSenhaPage";
import { DashboardPage } from "./pages/DashboardPage";
import { OrcamentosPage } from "./pages/OrcamentosPage";
import { ClientesPage } from "./pages/ClientesPage";
import { ProdutosPage } from "./pages/ProdutosPage";
import { NovoOrcamentoPage } from "./pages/NovoOrcamentoPage";
import { OrcamentoDetailPage } from "./pages/OrcamentoDetailPage";
import { PublicOrcamentoPage } from "./pages/PublicOrcamentoPage";
import { ConfiguracoesPage } from "./pages/ConfiguracoesPage";
import { PlanosPage } from "./pages/PlanosPage";
import { IndicacaoPage } from "./pages/IndicacaoPage";
import { OperacoesPage } from "./pages/OperacoesPage";
import { PublicStorefrontPage } from "./pages/PublicStorefrontPage";
import { AdminProtectedRoute } from "./components/layout/AdminProtectedRoute";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminEmpresasPage } from "./pages/admin/AdminEmpresasPage";
import { AdminAuditoriaPage } from "./pages/admin/AdminAuditoriaPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registrar" element={<RegisterPage />} />
      <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
      <Route
        path="/painel"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orcamentos"
        element={
          <ProtectedRoute>
            <OrcamentosPage />
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
      <Route path="/loja/:slug" element={<PublicStorefrontPage />} />
      <Route
        path="/operacoes"
        element={
          <ProtectedRoute>
            <OperacoesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute>
            <ConfiguracoesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/planos"
        element={
          <ProtectedRoute>
            <PlanosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/indicacao"
        element={
          <ProtectedRoute>
            <IndicacaoPage />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminEmpresasPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/auditoria"
        element={
          <AdminProtectedRoute>
            <AdminAuditoriaPage />
          </AdminProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
