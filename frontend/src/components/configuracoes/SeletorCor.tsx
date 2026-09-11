import { useId, useState } from "react";
import { cn } from "../../lib/cn";

const PALETA_SUGERIDA = [
  "#167b73", // verde-petróleo (padrão MOVA)
  "#0f172a", // grafite
  "#1d4ed8", // azul
  "#7c3aed", // roxo
  "#be123c", // vinho
  "#c2410c", // laranja queimado
  "#15803d", // verde
  "#0e7490", // azul-petróleo
];

interface SeletorCorProps {
  rotulo: string;
  valor: string;
  aoAlterar: (cor: string) => void;
}

/**
 * Escolha de cor pensada pra quem não conhece HEX: uma paleta de swatches
 * clicáveis primeiro, com o seletor nativo + código HEX disponíveis como
 * opção avançada, não como a única forma de escolher.
 */
export function SeletorCor({ rotulo, valor, aoAlterar }: SeletorCorProps) {
  const [mostrarAvancado, setMostrarAvancado] = useState(false);
  const idInput = useId();

  return (
    <div>
      <p className="text-sm font-medium text-ink-700">{rotulo}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {PALETA_SUGERIDA.map((cor) => (
          <button
            key={cor}
            type="button"
            onClick={() => aoAlterar(cor)}
            aria-label={`Usar a cor ${cor}`}
            aria-pressed={valor.toLowerCase() === cor}
            className={cn(
              "h-8 w-8 shrink-0 rounded-full border-2 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
              valor.toLowerCase() === cor ? "border-ink-900 scale-110 dark:border-white" : "border-transparent hover:scale-105"
            )}
            style={{ backgroundColor: cor }}
          />
        ))}

        <button
          type="button"
          onClick={() => setMostrarAvancado((atual) => !atual)}
          aria-expanded={mostrarAvancado}
          aria-controls={idInput}
          className="ml-1 flex h-8 items-center gap-1.5 rounded-full border border-dashed border-ink-300 px-2.5 text-xs font-medium text-ink-500 hover:bg-ink-50"
        >
          <span className="h-4 w-4 rounded-full border border-ink-300" style={{ backgroundColor: valor }} />
          Outra cor
        </button>
      </div>

      {mostrarAvancado && (
        <div id={idInput} className="mt-3 flex items-center gap-3">
          <input
            type="color"
            value={valor}
            onChange={(e) => aoAlterar(e.target.value)}
            className="h-9 w-14 rounded-lg border border-ink-200"
          />
          <input
            type="text"
            value={valor}
            onChange={(e) => aoAlterar(e.target.value)}
            placeholder="#167B73"
            maxLength={7}
            className="h-9 w-28 rounded-lg border border-ink-200 bg-surface px-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      )}
    </div>
  );
}
