import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Alert } from "../ui/Alert";
import { ApiError } from "../../lib/api";
import type { PreviewImportacao, ResultadoImportacao } from "../../lib/api";

interface ImportacaoModalProps {
  aberto: boolean;
  aoFechar: () => void;
  aoConcluir: () => void;
  titulo: string;
  apiPreview: (arquivoBase64: string) => Promise<PreviewImportacao>;
  apiConfirmar: (arquivoBase64: string, mapeamento: Record<string, number>, importarDuplicados?: boolean) => Promise<ResultadoImportacao>;
}

type Etapa = "upload" | "mapear" | "resultado";

const NAO_MAPEAR = "__nao_mapear__";

function lerArquivoComoBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onloadend = () => {
      const resultado = leitor.result as string;
      resolve(resultado.split(",")[1] ?? "");
    };
    leitor.onerror = reject;
    leitor.readAsDataURL(arquivo);
  });
}

/**
 * Fluxo de importação de CSV reaproveitado por Clientes e Produtos — mesma
 * experiência (enviar arquivo, mapear colunas, ver prévia com problemas,
 * confirmar), só a lista de campos e as chamadas de API mudam por entidade.
 * Nunca grava nada até o usuário confirmar explicitamente.
 */
export function ImportacaoModal({ aberto, aoFechar, aoConcluir, titulo, apiPreview, apiConfirmar }: ImportacaoModalProps) {
  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [arquivoBase64, setArquivoBase64] = useState("");
  const [preview, setPreview] = useState<PreviewImportacao | null>(null);
  const [mapeamento, setMapeamento] = useState<Record<string, number>>({});
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);

  function fecharTudo() {
    setEtapa("upload");
    setErro(null);
    setArquivoBase64("");
    setPreview(null);
    setMapeamento({});
    setResultado(null);
    aoFechar();
  }

  async function aoSelecionarArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;

    setErro(null);
    setCarregando(true);
    try {
      const base64 = await lerArquivoComoBase64(arquivo);
      const resultadoPreview = await apiPreview(base64);
      setArquivoBase64(base64);
      setPreview(resultadoPreview);
      setMapeamento(resultadoPreview.mapeamentoSugerido);
      setEtapa("mapear");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível ler o arquivo.");
    } finally {
      setCarregando(false);
    }
  }

  function atualizarMapeamento(campo: string, valor: string) {
    setMapeamento((atual) => {
      const novo = { ...atual };
      if (valor === NAO_MAPEAR) {
        delete novo[campo];
      } else {
        novo[campo] = Number(valor);
      }
      return novo;
    });
  }

  async function confirmar(importarDuplicados?: boolean) {
    setErro(null);
    setCarregando(true);
    try {
      const resultadoConfirmacao = await apiConfirmar(arquivoBase64, mapeamento, importarDuplicados);
      setResultado(resultadoConfirmacao);
      setEtapa("resultado");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível concluir a importação.");
    } finally {
      setCarregando(false);
    }
  }

  const camposObrigatoriosFaltando = preview?.campos.filter((c) => c.obrigatorio && mapeamento[c.campo] === undefined) ?? [];

  return (
    <Modal titulo={titulo} aberto={aberto} aoFechar={fecharTudo} tamanho="grande">
      <div className="flex flex-col gap-4">
        {erro && <Alert tipo="erro">{erro}</Alert>}

        {etapa === "upload" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-600">
              Envie um arquivo CSV ou XLSX (exportado do Excel, Google Planilhas ou outro sistema). Limite de 2MB e
              2000 linhas por importação.
            </p>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink-200 px-6 py-10 text-center hover:border-brand-400 hover:bg-brand-50/40">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14" />
              </svg>
              <span className="text-sm font-medium text-ink-700">Clique para escolher um arquivo .csv ou .xlsx</span>
              <input
                type="file"
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={aoSelecionarArquivo}
                disabled={carregando}
              />
            </label>
            {carregando && <p className="text-center text-sm text-ink-500">Lendo arquivo...</p>}
          </div>
        )}

        {etapa === "mapear" && preview && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-600">
              {preview.totalLinhas} linha(s) encontrada(s). Confira se cada coluna do seu arquivo foi ligada ao campo
              certo do MOVA.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {preview.campos.map((campo) => (
                <Select
                  key={campo.campo}
                  rotulo={`${campo.rotulo}${campo.obrigatorio ? " (obrigatório)" : ""}`}
                  value={mapeamento[campo.campo] !== undefined ? String(mapeamento[campo.campo]) : NAO_MAPEAR}
                  onChange={(e) => atualizarMapeamento(campo.campo, e.target.value)}
                >
                  <option value={NAO_MAPEAR}>Não importar</option>
                  {preview.colunas.map((coluna, indice) => (
                    <option key={indice} value={indice}>
                      {coluna}
                    </option>
                  ))}
                </Select>
              ))}
            </div>

            {camposObrigatoriosFaltando.length > 0 && (
              <Alert tipo="aviso">
                Ligue a coluna correta para: {camposObrigatoriosFaltando.map((c) => c.rotulo).join(", ")}.
              </Alert>
            )}

            <div>
              <p className="text-sm font-medium text-ink-700">Prévia (primeiras linhas)</p>
              <div className="mt-2 overflow-x-auto rounded-lg border border-ink-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink-50 text-xs font-semibold uppercase text-ink-500">
                    <tr>
                      {preview.campos.map((campo) => (
                        <th key={campo.campo} className="whitespace-nowrap px-3 py-2">
                          {campo.rotulo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.linhasExemplo.map((linha, indiceLinha) => (
                      <tr key={indiceLinha} className="border-t border-ink-100">
                        {preview.campos.map((campo) => {
                          const indiceColuna = mapeamento[campo.campo];
                          const valor = indiceColuna !== undefined ? linha[indiceColuna] : undefined;
                          const faltando = campo.obrigatorio && (!valor || valor.trim() === "");
                          return (
                            <td key={campo.campo} className={`whitespace-nowrap px-3 py-2 ${faltando ? "bg-danger-50 text-danger-700" : "text-ink-700"}`}>
                              {valor && valor.trim() !== "" ? valor : faltando ? "Faltando" : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variante="secundario" onClick={() => setEtapa("upload")} disabled={carregando}>
                Voltar
              </Button>
              <Button type="button" onClick={() => confirmar()} carregando={carregando} disabled={camposObrigatoriosFaltando.length > 0}>
                Importar
              </Button>
            </div>
          </div>
        )}

        {etapa === "resultado" && resultado && (
          <div className="flex flex-col gap-4">
            <Alert tipo={resultado.criados > 0 ? "sucesso" : "aviso"}>
              {resultado.criados} registro(s) importado(s) com sucesso.
            </Alert>

            {resultado.duplicados > 0 && (
              <div className="rounded-lg border border-warning-100 bg-warning-50 p-3">
                <p className="text-sm font-medium text-warning-700">
                  {resultado.duplicados} linha(s) não foram importadas por já existirem no cadastro (ou repetidas no
                  próprio arquivo).
                </p>
                <Button tamanho="sm" variante="secundario" className="mt-2" onClick={() => confirmar(true)} carregando={carregando}>
                  Importar mesmo assim
                </Button>
              </div>
            )}

            {resultado.invalidos.length > 0 && (
              <div className="rounded-lg border border-danger-100 bg-danger-50 p-3">
                <p className="text-sm font-medium text-danger-700">{resultado.invalidos.length} linha(s) com problema — não importadas:</p>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-danger-700">
                  {resultado.invalidos.slice(0, 20).map((item, i) => (
                    <li key={i}>
                      Linha {item.linha}: {item.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  fecharTudo();
                  aoConcluir();
                }}
              >
                Concluir
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
