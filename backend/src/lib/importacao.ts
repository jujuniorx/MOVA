import { parseCsv } from "./csv";
import type { CsvParseado } from "./csv";
import { MAX_LINHAS_IMPORTACAO } from "../schemas/importacao.schema";

export interface CampoImportavel {
  campo: string;
  rotulo: string;
  obrigatorio: boolean;
  sinonimos: string[];
}

export interface ArquivoDecodificado extends CsvParseado {
  totalLinhas: number;
}

export class ArquivoImportacaoError extends Error {}

/** Decodifica o base64, faz o parse do CSV e aplica o limite de linhas — nunca trunca silenciosamente. */
export function decodificarArquivo(arquivoBase64: string): ArquivoDecodificado {
  let texto: string;
  try {
    texto = Buffer.from(arquivoBase64, "base64").toString("utf-8");
  } catch {
    throw new ArquivoImportacaoError("Não foi possível ler o arquivo. Envie um CSV válido.");
  }

  const parseado = parseCsv(texto);
  if (parseado.cabecalho.length === 0) {
    throw new ArquivoImportacaoError("O arquivo está vazio ou não é um CSV válido.");
  }
  if (parseado.linhas.length > MAX_LINHAS_IMPORTACAO) {
    throw new ArquivoImportacaoError(
      `Este arquivo tem ${parseado.linhas.length} linhas — o limite por importação é ${MAX_LINHAS_IMPORTACAO}. Divida em arquivos menores.`
    );
  }

  return { ...parseado, totalLinhas: parseado.linhas.length };
}

// Remove marcas diacríticas combinantes (U+0300–U+036F) deixadas pelo
// normalize("NFD") — evitando um literal de regex com caractere combinante
// no próprio código-fonte, que é frágil de editar/revisar.
function removerDiacriticos(texto: string): string {
  let resultado = "";
  for (const ch of texto) {
    const codigo = ch.codePointAt(0)!;
    if (codigo < 0x0300 || codigo > 0x036f) resultado += ch;
  }
  return resultado;
}

function normalizarCabecalho(h: string): string {
  return removerDiacriticos(h.normalize("NFD"))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Sugere um mapeamento campo->coluna comparando o cabeçalho do CSV com sinônimos conhecidos — nunca força um mapeamento, só sugere. */
export function sugerirMapeamento(cabecalho: string[], campos: CampoImportavel[]): Record<string, number> {
  const normalizados = cabecalho.map(normalizarCabecalho);
  const sugestao: Record<string, number> = {};

  for (const campo of campos) {
    const candidatos = [campo.campo, ...campo.sinonimos].map(normalizarCabecalho);
    const indice = normalizados.findIndex((h) => candidatos.includes(h));
    if (indice !== -1) sugestao[campo.campo] = indice;
  }

  return sugestao;
}

/** Aplica um mapeamento a uma linha, devolvendo um objeto { campo: valor } só com os campos mapeados e preenchidos. */
export function aplicarMapeamento(linha: string[], mapeamento: Record<string, number>): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const [campo, indice] of Object.entries(mapeamento)) {
    const valor = linha[indice];
    if (valor !== undefined && valor.trim() !== "") {
      resultado[campo] = valor.trim();
    }
  }
  return resultado;
}
