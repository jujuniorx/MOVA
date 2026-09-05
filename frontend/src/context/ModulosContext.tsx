import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { empresaApi } from "../lib/api";
import type { ModuloInfo } from "../lib/api";
import { useAuth } from "./AuthContext";

interface ModulosContextValor {
  modulos: ModuloInfo[];
  carregando: boolean;
  /// Verdadeiro se o módulo está disponível AGORA para esta empresa
  /// (sempreAtivo OU explicitamente ativado) — a checagem que toda tela e
  /// toda rota protegida por módulo deve usar.
  moduloAtivo: (id: string) => boolean;
  recarregar: () => Promise<void>;
}

const ModulosContext = createContext<ModulosContextValor | null>(null);

export function ModulosProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [modulos, setModulos] = useState<ModuloInfo[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!usuario) {
      setModulos([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const { modulos: lista } = await empresaApi.obterModulos();
      setModulos(lista);
    } catch {
      // Falha ao buscar módulos nunca deve travar o app inteiro — na dúvida,
      // o app funciona como se nenhum módulo opcional estivesse ativo (mais
      // conservador do que assumir tudo ativo por engano).
      setModulos([]);
    } finally {
      setCarregando(false);
    }
  }, [usuario]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  function moduloAtivo(id: string): boolean {
    const modulo = modulos.find((m) => m.id === id);
    return Boolean(modulo?.ativo);
  }

  return (
    <ModulosContext.Provider value={{ modulos, carregando, moduloAtivo, recarregar }}>
      {children}
    </ModulosContext.Provider>
  );
}

export function useModulos() {
  const contexto = useContext(ModulosContext);
  if (!contexto) {
    throw new Error("useModulos precisa ser usado dentro de um ModulosProvider.");
  }
  return contexto;
}
