import type { CSSProperties } from "react";
import { cn } from "../lib/cn";
import logoSimboloMascara from "../assets/logo-mova-simbolo.png";
import logoTextoMascara from "../assets/logo-mova-texto.png";

type Tom = "claro" | "escuro";

interface LogoProps {
  /** "escuro" = marca escura para fundos claros (inverte com o tema). "claro" = marca sempre branca. */
  tom?: Tom;
  /** Esconde o wordmark e mostra apenas o símbolo. */
  apenasSimbolo?: boolean;
  className?: string;
}

/**
 * Aplica um recorte do asset oficial da marca (frontend/src/assets/logo-mova-*.png)
 * como máscara CSS: o desenho (contorno oficial) vem do PNG, a cor vem de
 * `currentColor` — assim a mesma marca funciona em qualquer tema/contexto só
 * trocando a classe de cor do texto, sem precisar de um arquivo por cor.
 */
function estiloMascara(asset: string, larguraOriginal: number, alturaOriginal: number): CSSProperties {
  return {
    aspectRatio: `${larguraOriginal} / ${alturaOriginal}`,
    backgroundColor: "currentColor",
    WebkitMaskImage: `url(${asset})`,
    maskImage: `url(${asset})`,
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  };
}

/** Símbolo oficial do MOVA — recorte fiel do asset de marca aprovado. */
export function LogoSimbolo({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block w-14 shrink-0 text-ink-900", className)}
      style={estiloMascara(logoSimboloMascara, 1045, 381)}
    />
  );
}

/**
 * Composição oficial: símbolo em cima, "MOVA" embaixo, centralizados — sem
 * slogan (só aparece na marca completa, fora do cabeçalho). Os dois vêm do
 * mesmo asset oficial (frontend/public/assets/logo-mova-oficial-transparente.png),
 * recortados por região e aplicados como máscara — nenhuma fonte é usada
 * para o "MOVA".
 */
export function Logo({ tom = "escuro", apenasSimbolo = false, className = "" }: LogoProps) {
  const corMarca = tom === "claro" ? "text-white" : "text-ink-900";

  return (
    <span className={cn("inline-flex flex-col items-center gap-1", className)} aria-label="MOVA">
      <LogoSimbolo className={corMarca} />
      {!apenasSimbolo && (
        <span
          aria-hidden="true"
          className={cn("inline-block w-16 shrink-0", corMarca)}
          style={estiloMascara(logoTextoMascara, 1186, 184)}
        />
      )}
    </span>
  );
}
