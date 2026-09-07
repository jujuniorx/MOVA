import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Card, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ApiError, adminApi } from "../../lib/api";
import type { FeatureFlagAdmin } from "../../lib/api";

const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export function AdminFuncionalidadesExperimentaisPage() {
  const [flags, setFlags] = useState<FeatureFlagAdmin[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novaChave, setNovaChave] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [criando, setCriando] = useState(false);
  const [alternando, setAlternando] = useState<string | null>(null);

  function carregar() {
    adminApi
      .listarFeatureFlags()
      .then(setFlags)
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar as funcionalidades experimentais."));
  }

  useEffect(carregar, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!novaChave.trim() || !novoNome.trim()) return;
    setCriando(true);
    setErro(null);
    try {
      await adminApi.criarFeatureFlag({ chave: novaChave.trim(), nome: novoNome.trim() });
      setNovaChave("");
      setNovoNome("");
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível criar.");
    } finally {
      setCriando(false);
    }
  }

  async function alternar(flag: FeatureFlagAdmin) {
    setAlternando(flag.id);
    try {
      await adminApi.atualizarFeatureFlag(flag.id, { ativoGlobal: !flag.ativoGlobal });
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível alterar.");
    } finally {
      setAlternando(null);
    }
  }

  return (
    <AdminLayout>
      <PageHeader
        titulo="Funcionalidades experimentais"
        subtitulo="Liberação gradual de recursos novos — hoje nenhuma funcionalidade do produto lê isto ainda."
      />

      {erro && (
        <div className="mt-4">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      <Card className="mt-6">
        <CardHeader titulo="Criar nova" />
        <form onSubmit={criar} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input rotulo="Chave (ex.: dashboard_v2)" value={novaChave} onChange={(e) => setNovaChave(e.target.value)} className="sm:w-56" />
          <Input rotulo="Nome" className="flex-1" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
          <Button type="submit" carregando={criando}>
            Criar
          </Button>
        </form>
      </Card>

      {!flags ? (
        <Skeleton className="mt-6 h-32" />
      ) : flags.length === 0 ? (
        <EmptyState className="mt-6" titulo="Nenhuma funcionalidade experimental criada ainda." />
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {flags.map((f) => (
            <li key={f.id}>
              <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-900">{f.nome}</p>
                    <Badge className="bg-ink-100 text-ink-600">{f.chave}</Badge>
                    <Badge className={f.ativoGlobal ? "bg-success-100 text-success-700" : "bg-ink-100 text-ink-500"}>
                      {f.ativoGlobal ? "Ativa para todos" : "Desligada"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {f.descricao ? `${f.descricao} · ` : ""}criada em {formatoData.format(new Date(f.criadoEm))}
                  </p>
                </div>
                <Button
                  variante="secundario"
                  tamanho="sm"
                  carregando={alternando === f.id}
                  onClick={() => alternar(f)}
                >
                  {f.ativoGlobal ? "Desligar" : "Ativar para todos"}
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminLayout>
  );
}
