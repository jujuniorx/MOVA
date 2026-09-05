/**
 * Parser mínimo e correto de CSV — lida com campos entre aspas contendo
 * vírgulas, quebras de linha e aspas escapadas (""), sem depender de
 * split(",") ingênuo (que quebra em qualquer CSV exportado de Excel/Sheets
 * com um campo de texto livre contendo vírgula). Detecta o separador (vírgula
 * ou ponto-e-vírgula, comum em CSV exportado em pt-BR) pela primeira linha.
 */
export interface CsvParseado {
  cabecalho: string[];
  linhas: string[][];
}

export function parseCsv(texto: string): CsvParseado {
  const conteudo = texto.replace(/^﻿/, ""); // remove BOM do Excel, se houver
  const separador = detectarSeparador(conteudo);

  const linhasBrutas: string[][] = [];
  let campoAtual = "";
  let linhaAtual: string[] = [];
  let dentroDeAspas = false;
  let i = 0;

  while (i < conteudo.length) {
    const c = conteudo[i];

    if (dentroDeAspas) {
      if (c === '"') {
        if (conteudo[i + 1] === '"') {
          campoAtual += '"';
          i += 2;
          continue;
        }
        dentroDeAspas = false;
        i++;
        continue;
      }
      campoAtual += c;
      i++;
      continue;
    }

    if (c === '"') {
      dentroDeAspas = true;
      i++;
      continue;
    }
    if (c === separador) {
      linhaAtual.push(campoAtual);
      campoAtual = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      linhaAtual.push(campoAtual);
      linhasBrutas.push(linhaAtual);
      linhaAtual = [];
      campoAtual = "";
      i++;
      continue;
    }
    campoAtual += c;
    i++;
  }
  // Última linha (sem \n final)
  if (campoAtual !== "" || linhaAtual.length > 0) {
    linhaAtual.push(campoAtual);
    linhasBrutas.push(linhaAtual);
  }

  const linhasNaoVazias = linhasBrutas.filter((linha) => linha.some((v) => v.trim() !== ""));
  if (linhasNaoVazias.length === 0) {
    return { cabecalho: [], linhas: [] };
  }

  const [cabecalho, ...linhas] = linhasNaoVazias;
  return { cabecalho: cabecalho.map((c) => c.trim()), linhas };
}

function detectarSeparador(texto: string): string {
  const primeiraLinha = texto.split(/\r?\n/, 1)[0] ?? "";
  const virgulas = (primeiraLinha.match(/,/g) ?? []).length;
  const pontoVirgulas = (primeiraLinha.match(/;/g) ?? []).length;
  return pontoVirgulas > virgulas ? ";" : ",";
}

/** Converte "10,50" ou "10.50" ou "R$ 10,50" em 10.5 — nunca inventa um valor, devolve null se não parsear. */
export function parseNumeroBr(valor: string): number | null {
  const limpo = valor
    .replace(/[^\d,.\-]/g, "")
    .trim();
  if (!limpo) return null;

  let normalizado = limpo;
  const temVirgula = limpo.includes(",");
  const temPonto = limpo.includes(".");
  if (temVirgula && temPonto) {
    // Formato "1.234,56" -> remove separador de milhar (ponto), vírgula vira decimal.
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (temVirgula) {
    normalizado = limpo.replace(",", ".");
  }

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}
