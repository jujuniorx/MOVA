import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { adminApi, limparTokenAdmin, obterTokenAdmin, salvarTokenAdmin } from "../lib/api";
import type { AdminAutenticado } from "../lib/api";

interface AdminAuthContextValor {
  admin: AdminAutenticado | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  sair: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValor | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminAutenticado | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = obterTokenAdmin();
    if (!token) {
      setCarregando(false);
      return;
    }
    adminApi
      .me()
      .then((resposta) => setAdmin(resposta.admin))
      .catch(() => limparTokenAdmin())
      .finally(() => setCarregando(false));
  }, []);

  async function login(email: string, senha: string) {
    const resposta = await adminApi.login(email, senha);
    salvarTokenAdmin(resposta.token);
    setAdmin(resposta.admin);
  }

  function sair() {
    limparTokenAdmin();
    setAdmin(null);
  }

  return <AdminAuthContext.Provider value={{ admin, carregando, login, sair }}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const contexto = useContext(AdminAuthContext);
  if (!contexto) {
    throw new Error("useAdminAuth precisa ser usado dentro de um AdminAuthProvider.");
  }
  return contexto;
}
