import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type Tema = "claro" | "escuro";

const CHAVE_TEMA = "mova_tema";

interface ThemeContextValor {
  tema: Tema;
  alternarTema: () => void;
}

const ThemeContext = createContext<ThemeContextValor | null>(null);

function lerTemaSalvo(): Tema {
  return localStorage.getItem(CHAVE_TEMA) === "escuro" ? "escuro" : "claro";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(lerTemaSalvo);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "escuro");
    localStorage.setItem(CHAVE_TEMA, tema);
  }, [tema]);

  function alternarTema() {
    setTema((atual) => (atual === "claro" ? "escuro" : "claro"));
  }

  return <ThemeContext.Provider value={{ tema, alternarTema }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const contexto = useContext(ThemeContext);
  if (!contexto) {
    throw new Error("useTheme precisa ser usado dentro de um ThemeProvider.");
  }
  return contexto;
}
