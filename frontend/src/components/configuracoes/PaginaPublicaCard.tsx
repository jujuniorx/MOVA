import { useState } from "react";
import { Card, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { useAuth } from "../../context/AuthContext";
import { ApiError, empresaApi } from "../../lib/api";

export function PaginaPublicaCard() {
  const { empresa, atualizarEmpresa } = useAuth();
  const [ativa, setAtiva] = useState(empresa?.paginaPublicaAtiva ?? false);
  const [slug, setSlug] = useState(empresa?.slugPublico ?? "");
  const [exibirPrecos, setExibirPrecos] = useState(empresa?.exibirPrecosPublico ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function salvar() {
    setErro(null);
    setSucesso(false);
    setSalvando(true);
    try {
      const atualizada = await empresaApi.atualizar({
        paginaPublicaAtiva: ativa,
        slugPublico: slug || undefined,
        exibirPrecosPublico: exibirPrecos,
      });
      atualizarEmpresa(atualizada);
      setSucesso(true);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível salvar a página pública.");
    } finally {
      setSalvando(false);
    }
  }

  const urlPublica = slug ? `${window.location.origin}/loja/${slug}` : null;

  return (
    <Card>
      <CardHeader
        titulo="Página pública da empresa"
        descricao="Uma página própria para divulgar seus produtos e serviços, sem precisar de login."
      />
      <div className="mt-4 flex flex-col gap-4">
        {erro && <Alert tipo="erro">{erro}</Alert>}
        {sucesso && <Alert tipo="sucesso">Página pública atualizada.</Alert>}

        <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
          <input
            type="checkbox"
            checked={ativa}
            onChange={(e) => setAtiva(e.target.checked)}
            className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          />
          Ativar página pública
        </label>

        <Input
          rotulo="Endereço da página"
          placeholder="minha-empresa"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          dica={urlPublica ?? "Escolha um endereço curto, sem espaços (ex: minha-empresa)."}
        />

        <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
          <input
            type="checkbox"
            checked={exibirPrecos}
            onChange={(e) => setExibirPrecos(e.target.checked)}
            className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          />
          Exibir preços na página pública
        </label>

        <p className="text-xs text-ink-500">
          Marque "Exibir na página pública" em cada produto (na tela Produtos) para ele aparecer aqui.
        </p>

        <div>
          <Button type="button" onClick={salvar} carregando={salvando}>
            Salvar página pública
          </Button>
        </div>
      </div>
    </Card>
  );
}
