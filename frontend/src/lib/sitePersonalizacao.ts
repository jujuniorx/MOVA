export type TemaSite = "claro" | "escuro";
export type EstiloSite = "minimalista" | "moderno" | "elegante" | "impactante";
export type SecaoSite = "produtos" | "sobre" | "diferenciais" | "contato";

export interface SitePersonalizacao {
  tema?: TemaSite;
  estilo?: EstiloSite;
  sobreTexto?: string;
  diferenciais?: string[];
  redesSociais?: { instagram?: string; facebook?: string; tiktok?: string };
  horarioAtendimento?: string;
  secoesAtivas?: SecaoSite[];
}

export const ESTILOS_SITE: { valor: EstiloSite; rotulo: string; descricao: string }[] = [
  { valor: "minimalista", rotulo: "Minimalista", descricao: "Espaços amplos, bordas discretas, visual bem limpo." },
  { valor: "moderno", rotulo: "Moderno", descricao: "Equilíbrio entre clareza e destaque — combina com a maioria dos negócios." },
  { valor: "elegante", rotulo: "Elegante", descricao: "Cantos mais arredondados e sombras suaves, para uma marca mais refinada." },
  { valor: "impactante", rotulo: "Impactante", descricao: "Títulos maiores e botões com mais presença, para um visual mais ousado." },
];

export const SECOES_SITE: { valor: SecaoSite; rotulo: string }[] = [
  { valor: "produtos", rotulo: "Produtos e serviços" },
  { valor: "sobre", rotulo: "Sobre a empresa" },
  { valor: "diferenciais", rotulo: "Diferenciais" },
  { valor: "contato", rotulo: "Contato" },
];

interface TokensEstilo {
  radiusCard: string;
  radiusBotao: string;
  sombraCard: string;
  bordaCard: string;
  tituloClasse: string;
  botaoPeso: string;
}

// Cada preset é uma combinação coerente de traços (raio, sombra, peso) —
// nunca controles soltos. Reaproveita as mesmas classes/tokens Tailwind já
// usados no resto do MOVA (nada de CSS novo por estilo).
export const TOKENS_POR_ESTILO: Record<EstiloSite, TokensEstilo> = {
  minimalista: {
    radiusCard: "rounded-lg",
    radiusBotao: "rounded-lg",
    sombraCard: "shadow-none",
    bordaCard: "border border-ink-200",
    tituloClasse: "text-3xl sm:text-4xl font-bold tracking-tight",
    botaoPeso: "font-medium",
  },
  moderno: {
    radiusCard: "rounded-xl",
    radiusBotao: "rounded-lg",
    sombraCard: "shadow-[var(--shadow-card)]",
    bordaCard: "border border-ink-200",
    tituloClasse: "text-3xl sm:text-4xl font-bold tracking-tight",
    botaoPeso: "font-semibold",
  },
  elegante: {
    radiusCard: "rounded-2xl",
    radiusBotao: "rounded-full",
    sombraCard: "shadow-[var(--shadow-card)]",
    bordaCard: "border border-ink-100",
    tituloClasse: "text-3xl sm:text-4xl font-semibold tracking-tight",
    botaoPeso: "font-medium",
  },
  impactante: {
    radiusCard: "rounded-2xl",
    radiusBotao: "rounded-xl",
    sombraCard: "shadow-lg",
    bordaCard: "border-0",
    tituloClasse: "text-4xl sm:text-5xl font-extrabold tracking-tight",
    botaoPeso: "font-bold",
  },
};

/** Preenche os padrões (tema claro, estilo moderno) sem exigir que a empresa tenha configurado nada. */
export function comPadroes(p: SitePersonalizacao | null | undefined): SitePersonalizacao & { tema: TemaSite; estilo: EstiloSite } {
  return {
    tema: p?.tema ?? "claro",
    estilo: p?.estilo ?? "moderno",
    sobreTexto: p?.sobreTexto,
    diferenciais: p?.diferenciais ?? [],
    redesSociais: p?.redesSociais ?? {},
    horarioAtendimento: p?.horarioAtendimento,
    secoesAtivas: p?.secoesAtivas,
  };
}

/**
 * Decide se uma seção aparece. A escolha da empresa (secoesAtivas) só pode
 * ESCONDER uma seção — nunca força a EXIBIÇÃO de uma seção sem dado real pra
 * quem visita a página de verdade (isso mostraria um espaço vazio ou um
 * texto de instrução interna pro público). Na prévia do editor (modoPreview)
 * a seção aparece conforme a escolha mesmo sem dado, com um texto explicando
 * o que falta preencher — só quem está editando vê isso.
 */
export function secaoVisivel(
  id: SecaoSite,
  secoesAtivas: SecaoSite[] | undefined,
  temDado: boolean,
  modoPreview: boolean
): boolean {
  const escolhida = secoesAtivas ? secoesAtivas.includes(id) : true;
  return modoPreview ? escolhida : escolhida && temDado;
}

/**
 * Contraste automático (aproximação de luminância relativa sRGB) — decide
 * texto branco ou escuro por cima de uma cor de fundo, para nunca deixar o
 * empreendedor escolher uma combinação obviamente ilegível sem tratamento.
 */
export function corDeTextoContrastante(corFundoHex: string | undefined | null): string {
  if (!corFundoHex || !/^#[0-9a-fA-F]{6}$/.test(corFundoHex)) return "#ffffff";
  const r = parseInt(corFundoHex.slice(1, 3), 16);
  const g = parseInt(corFundoHex.slice(3, 5), 16);
  const b = parseInt(corFundoHex.slice(5, 7), 16);
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6 ? "#1c2020" : "#ffffff";
}
