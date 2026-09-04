import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ApiError, authApi, limparToken, obterToken, salvarToken } from "../lib/api";
import type { Empresa, Usuario } from "../lib/api";

interface AuthContextValor {
  usuario: Usuario | null;
  empresa: Empresa | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  registrar: (
    nomeEmpresa: string,
    nomeUsuario: string,
    email: string,
    senha: string,
    codigoIndicacao?: string
  ) => Promise<void>;
  sair: () => void;
  atualizarEmpresa: (empresa: Empresa) => void;
}

const AuthContext = createContext<AuthContextValor | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = obterToken();
    if (!token) {
      setCarregando(false);
      return;
    }

    authApi
      .me()
      .then((resposta) => {
        setUsuario(resposta.usuario);
        setEmpresa(resposta.empresa);
      })
      .catch(() => {
        limparToken();
      })
      .finally(() => setCarregando(false));
  }, []);

  async function login(email: string, senha: string) {
    const resposta = await authApi.login(email, senha);
    salvarToken(resposta.token);
    setUsuario(resposta.usuario);
    setEmpresa(resposta.empresa);
  }

  async function registrar(
    nomeEmpresa: string,
    nomeUsuario: string,
    email: string,
    senha: string,
    codigoIndicacao?: string
  ) {
    const resposta = await authApi.registrar(nomeEmpresa, nomeUsuario, email, senha, codigoIndicacao);
    salvarToken(resposta.token);
    setUsuario(resposta.usuario);
    setEmpresa(resposta.empresa);
  }

  function sair() {
    limparToken();
    setUsuario(null);
    setEmpresa(null);
  }

  function atualizarEmpresa(empresaAtualizada: Empresa) {
    setEmpresa(empresaAtualizada);
  }

  return (
    <AuthContext.Provider
      value={{ usuario, empresa, carregando, login, registrar, sair, atualizarEmpresa }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth precisa ser usado dentro de um AuthProvider.");
  }
  return contexto;
}

export { ApiError };
