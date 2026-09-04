import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-ink-50">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"
          aria-label="Carregando"
          role="status"
        />
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
