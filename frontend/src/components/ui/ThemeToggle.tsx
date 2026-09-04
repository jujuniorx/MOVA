import { useTheme } from "../../context/ThemeContext";
import { cn } from "../../lib/cn";

function IconeSol() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconeLua() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

interface ThemeToggleProps {
  className?: string;
}

/** Alternância Claro/Escuro — só essas duas opções, sem "Sistema". */
export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { tema, alternarTema } = useTheme();
  const paraEscuro = tema === "claro";

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label={paraEscuro ? "Ativar modo escuro" : "Ativar modo claro"}
      title={paraEscuro ? "Modo escuro" : "Modo claro"}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ink-200 text-ink-600 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        className
      )}
    >
      {paraEscuro ? <IconeLua /> : <IconeSol />}
    </button>
  );
}
