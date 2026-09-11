import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { EsqueciSenhaPage } from "./pages/EsqueciSenhaPage";
import { RedefinirSenhaPage } from "./pages/RedefinirSenhaPage";
import { AceitarConvitePage } from "./pages/AceitarConvitePage";
import { DashboardPage } from "./pages/DashboardPage";
import { OrcamentosPage } from "./pages/OrcamentosPage";
import { ClientesPage } from "./pages/ClientesPage";
import { ProdutosPage } from "./pages/ProdutosPage";
import { NovoOrcamentoPage } from "./pages/NovoOrcamentoPage";
import { OrcamentoDetailPage } from "./pages/OrcamentoDetailPage";
import { PublicOrcamentoPage } from "./pages/PublicOrcamentoPage";
import { ConfiguracoesVisaoGeralPage } from "./pages/configuracoes/ConfiguracoesVisaoGeralPage";
import { ConfiguracoesEmpresaPage } from "./pages/configuracoes/ConfiguracoesEmpresaPage";
import { ConfiguracoesMarcaPage } from "./pages/configuracoes/ConfiguracoesMarcaPage";
import { ConfiguracoesNegocioPage } from "./pages/configuracoes/ConfiguracoesNegocioPage";
import { ConfiguracoesRecursosPage } from "./pages/configuracoes/ConfiguracoesRecursosPage";
import { ConfiguracoesOrcamentosPage } from "./pages/configuracoes/ConfiguracoesOrcamentosPage";
import { ConfiguracoesIAPage } from "./pages/configuracoes/ConfiguracoesIAPage";
import { ConfiguracoesIntegracoesPage } from "./pages/configuracoes/ConfiguracoesIntegracoesPage";
import { ConfiguracoesPlanoPage } from "./pages/configuracoes/ConfiguracoesPlanoPage";
import { ConfiguracoesAjudaPage } from "./pages/configuracoes/ConfiguracoesAjudaPage";
import { PlanosPage } from "./pages/PlanosPage";
import { IndicacaoPage } from "./pages/IndicacaoPage";
import { OperacoesPage } from "./pages/OperacoesPage";
import { IndicacoesClientesPage } from "./pages/IndicacoesClientesPage";
import { PublicStorefrontPage } from "./pages/PublicStorefrontPage";
import { AdminProtectedRoute } from "./components/layout/AdminProtectedRoute";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminInicioPage } from "./pages/admin/AdminInicioPage";
import { AdminEmpresasPage } from "./pages/admin/AdminEmpresasPage";
import { AdminUsuariosPage } from "./pages/admin/AdminUsuariosPage";
import { AdminPlanosPage } from "./pages/admin/AdminPlanosPage";
import { AdminAssinaturasPage } from "./pages/admin/AdminAssinaturasPage";
import { AdminAcessosEspeciaisPage } from "./pages/admin/AdminAcessosEspeciaisPage";
import { AdminProblemasPage } from "./pages/admin/AdminProblemasPage";
import { AdminIntegracoesPage } from "./pages/admin/AdminIntegracoesPage";
import { AdminMetricasPage } from "./pages/admin/AdminMetricasPage";
import { AdminFuncionalidadesExperimentaisPage } from "./pages/admin/AdminFuncionalidadesExperimentaisPage";
import { AdminSaudePage } from "./pages/admin/AdminSaudePage";
import { AdminSegurancaPage } from "./pages/admin/AdminSegurancaPage";
import { AdminAuditoriaPage } from "./pages/admin/AdminAuditoriaPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registrar" element={<RegisterPage />} />
      <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
      <Route path="/aceitar-convite" element={<AceitarConvitePage />} />
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
        path="/indicacoes-clientes"
        element={
          <ProtectedRoute>
            <IndicacoesClientesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute>
            <ConfiguracoesVisaoGeralPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes/empresa"
        element={
          <ProtectedRoute>
            <ConfiguracoesEmpresaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes/marca"
        element={
          <ProtectedRoute>
            <ConfiguracoesMarcaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes/negocio"
        element={
          <ProtectedRoute>
            <ConfiguracoesNegocioPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes/recursos"
        element={
          <ProtectedRoute>
            <ConfiguracoesRecursosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes/orcamentos"
        element={
          <ProtectedRoute>
            <ConfiguracoesOrcamentosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes/ia"
        element={
          <ProtectedRoute>
            <ConfiguracoesIAPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes/integracoes"
        element={
          <ProtectedRoute>
            <ConfiguracoesIntegracoesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes/plano"
        element={
          <ProtectedRoute>
            <ConfiguracoesPlanoPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes/ajuda"
        element={
          <ProtectedRoute>
            <ConfiguracoesAjudaPage />
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
            <AdminInicioPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/empresas"
        element={
          <AdminProtectedRoute>
            <AdminEmpresasPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <AdminProtectedRoute>
            <AdminUsuariosPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/planos"
        element={
          <AdminProtectedRoute>
            <AdminPlanosPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/assinaturas"
        element={
          <AdminProtectedRoute>
            <AdminAssinaturasPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/acessos-especiais"
        element={
          <AdminProtectedRoute>
            <AdminAcessosEspeciaisPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/problemas"
        element={
          <AdminProtectedRoute>
            <AdminProblemasPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/integracoes"
        element={
          <AdminProtectedRoute>
            <AdminIntegracoesPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/metricas"
        element={
          <AdminProtectedRoute>
            <AdminMetricasPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/funcionalidades-experimentais"
        element={
          <AdminProtectedRoute>
            <AdminFuncionalidadesExperimentaisPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/saude"
        element={
          <AdminProtectedRoute>
            <AdminSaudePage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/seguranca"
        element={
          <AdminProtectedRoute>
            <AdminSegurancaPage />
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
