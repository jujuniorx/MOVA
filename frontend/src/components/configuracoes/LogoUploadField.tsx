import { useRef, useState } from "react";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { useAuth } from "../../context/AuthContext";
import { ApiError, empresaApi } from "../../lib/api";

const TAMANHO_MAXIMO_MB = 2;

/**
 * Upload real de logo — substitui o campo antigo "URL do logotipo". Guarda a
 * imagem no próprio MOVA (ver POST/DELETE /empresa/logo) em vez de depender
 * de uma URL externa colada manualmente.
 */
export function LogoUploadField() {
  const { empresa, atualizarEmpresa } = useAuth();
  const [enviando, setEnviando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function aoEscolherArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = ""; // permite escolher o mesmo arquivo de novo depois
    if (!arquivo) return;

    if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
      setErro(`A imagem precisa ter até ${TAMANHO_MAXIMO_MB}MB.`);
      return;
    }

    setErro(null);
    setEnviando(true);
    try {
      const atualizada = await empresaApi.enviarLogo(arquivo);
      atualizarEmpresa(atualizada);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível enviar a imagem.");
    } finally {
      setEnviando(false);
    }
  }

  async function remover() {
    setErro(null);
    setRemovendo(true);
    try {
      const atualizada = await empresaApi.removerLogo();
      atualizarEmpresa(atualizada);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível remover a imagem.");
    } finally {
      setRemovendo(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink-700">Logo da empresa</label>
      {erro && <Alert tipo="erro">{erro}</Alert>}
      <div className="flex flex-wrap items-center gap-3">
        {empresa?.logoUrl && (
          <img src={empresa.logoUrl} alt="Logo atual" className="h-12 w-12 rounded-lg border border-ink-200 object-contain" />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={aoEscolherArquivo}
          className="hidden"
        />
        <Button type="button" tamanho="sm" variante="secundario" onClick={() => inputRef.current?.click()} carregando={enviando}>
          {empresa?.logoUrl ? "Alterar imagem" : "Adicionar logo"}
        </Button>
        {empresa?.logoUrl && (
          <Button type="button" tamanho="sm" variante="secundario" onClick={remover} carregando={removendo}>
            Remover
          </Button>
        )}
      </div>
      <p className="text-xs text-ink-500">PNG, JPEG ou WEBP, até {TAMANHO_MAXIMO_MB}MB.</p>
    </div>
  );
}
