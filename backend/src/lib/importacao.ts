import ExcelJS from "exceljs";
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

// Um .xlsx é, por baixo, um .zip — todo arquivo ZIP começa com essa
// assinatura de 4 bytes. Detectar pelo conteúdo (em vez de confiar só na
// extensão do nome do arquivo) evita que um CSV renomeado para .xlsx (ou
// vice-versa) seja interpretado do jeito errado.
const ASSINATURA_ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

function pareceXlsx(bytes: Buffer): boolean {
  return bytes.length >= 4 && bytes.subarray(0, 4).equals(ASSINATURA_ZIP);
}

async function parseXlsx(bytes: Buffer): Promise<CsvParseado> {
  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs empacota sua própria declaração de tipo global `Buffer extends
    // ArrayBuffer` (pensada para quem não tem @types/node instalado), que
    // conflita por merge de declaração com o Buffer real do Node em
    // @types/node recentes — só um problema de tipagem em tempo de
    // compilação; em tempo de execução um Buffer normal do Node é aceito.
    await workbook.xlsx.load(bytes as any);
  } catch {
    throw new ArquivoImportacaoError("Não foi possível ler esta planilha. Verifique se o arquivo .xlsx não está corrompido.");
  }

  const planilha = workbook.worksheets[0];
  if (!planilha) {
    throw new ArquivoImportacaoError("A planilha não tem nenhuma aba com dados.");
  }

  const linhasBrutas: string[][] = [];
  planilha.eachRow((linha) => {
    const valores: string[] = [];
    // ExcelJS usa índice de coluna baseado em 1 e `row.values[0]` é sempre
    // vazio — por isso o slice(1) — e cada célula pode ser um valor rico
    // (fórmula, hyperlink, data) que precisa virar texto simples aqui, já
    // que o resto do pipeline de importação só entende string[][].
    const celulas = Array.isArray(linha.values) ? linha.values.slice(1) : [];
    for (const valor of celulas) {
      valores.push(celulaParaTexto(valor));
    }
    linhasBrutas.push(valores);
  });

  const linhasNaoVazias = linhasBrutas.filter((linha) => linha.some((v) => v.trim() !== ""));
  if (linhasNaoVazias.length === 0) {
    return { cabecalho: [], linhas: [] };
  }

  const [cabecalho, ...linhas] = linhasNaoVazias;
  return { cabecalho: cabecalho.map((c) => c.trim()), linhas };
}

function celulaParaTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return valor.toLocaleDateString("pt-BR");
  if (typeof valor === "object") {
    // Célula com fórmula: usa o resultado calculado, nunca a fórmula em si.
    if ("result" in (valor as Record<string, unknown>)) return celulaParaTexto((valor as { result: unknown }).result);
    // Célula com hyperlink: usa o texto exibido, não a URL.
    if ("text" in (valor as Record<string, unknown>)) return String((valor as { text: unknown }).text ?? "");
    return "";
  }
  return String(valor);
}

/** Decodifica o base64 (CSV ou XLSX, detectado pelo conteúdo), faz o parse e aplica o limite de linhas — nunca trunca silenciosamente. */
export async function decodificarArquivo(arquivoBase64: string): Promise<ArquivoDecodificado> {
  let bytes: Buffer;
  try {
    bytes = Buffer.from(arquivoBase64, "base64");
  } catch {
    throw new ArquivoImportacaoError("Não foi possível ler o arquivo. Envie um CSV ou XLSX válido.");
  }

  const parseado = pareceXlsx(bytes) ? await parseXlsx(bytes) : parseCsv(bytes.toString("utf-8"));

  if (parseado.cabecalho.length === 0) {
    throw new ArquivoImportacaoError("O arquivo está vazio ou não é um CSV/XLSX válido.");
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
