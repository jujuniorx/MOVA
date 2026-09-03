import { twMerge } from "tailwind-merge";

/**
 * Combina classes do Tailwind e garante que a última classe passada vence em
 * caso de conflito (ex: um `bg-slate-100` do chamador sempre sobrepõe o
 * `bg-white` padrão de um componente) — sem depender da ordem imprevisível
 * do CSS gerado.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
