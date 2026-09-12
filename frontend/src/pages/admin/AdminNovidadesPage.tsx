import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Card, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ApiError, adminApi } from "../../lib/api";
import type { CategoriaNovidade, NovidadeAdmin } from "../../lib/api";

const ROTULO_CATEGORIA: Record<CategoriaNovidade, string> = {
  NOVO: "Novo",
  MELHORIA: "Melhoria",
  CORRECAO: "Correção",
  IMPORTANTE: "Importante",
};

const CLASSE_CATEGORIA: Record<CategoriaNovidade, string> = {
  NOVO: "bg-brand-100 text-brand-800",
  MELHORIA: "bg-success-100 text-success-700",
  CORRECAO: "bg-warning-100 text-warning-700",
  IMPORTANTE: "bg-danger-100 text-danger-700",
};

const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Único jeito de publicar uma novidade para todos os usuários do MOVA — a
 * rota de backend (POST/DELETE /admin/api/novidades) já existia desde que a
 * Central de Novidades foi criada, mas nunca teve uma tela: as 4 novidades
 * publicadas até hoje foram inseridas manualmente, uma única vez, no
 * lançamento da funcionalidade. Sem esta página, nenhuma novidade nova
 * chegava ao sino — não porque o sino estivesse quebrado, mas porque não
 * havia como publicar. Esta tela só expõe a capacidade que já existia.
 */
export function AdminNovidadesPage() {
  const [novidades, setNovidades] = useState<NovidadeAdmin[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [categoria, setCategoria] = useState<CategoriaNovidade>("NOVO");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [link, setLink] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const [paraExcluir, setParaExcluir] = useState<NovidadeAdmin | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  function carregar() {
    adminApi
      .listarNovidades()
      .then(setNovidades)
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar as novidades."));
  }

  useEffect(carregar, []);

  async function publicar() {
    setErroForm(null);
    if (!titulo.trim() || !descricao.trim()) {
      setErroForm("Preencha título e descrição.");
      return;
    }
    setPublicando(true);
    try {
      await adminApi.criarNovidade({ categoria, titulo: titulo.trim(), descricao: descricao.trim(), link: link.trim() || undefined });
      setTitulo("");
      setDescricao("");
      setLink("");
      setCategoria("NOVO");
      carregar();
    } catch (e) {
      setErroForm(e instanceof ApiError ? e.message : "Não foi possível publicar a novidade.");
    } finally {
      setPublicando(false);
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    setExcluindo(true);
    try {
      await adminApi.removerNovidade(paraExcluir.id);
      setParaExcluir(null);
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível remover a novidade.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <AdminLayout>
      <PageHeader
        titulo="Novidades"
        subtitulo="O que você publicar aqui aparece no sino de todos os usuários do MOVA — sem segmentação por plano ou módulo."
      />

      {erro && (
        <div className="mt-4">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      <Card className="mt-6">
        <CardHeader titulo="Publicar nova atualização" />
        <div className="mt-4 flex flex-col gap-3">
          {erroForm && <Alert tipo="erro">{erroForm}</Alert>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select rotulo="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaNovidade)}>
              {(Object.keys(ROTULO_CATEGORIA) as CategoriaNovidade[]).map((c) => (
                <option key={c} value={c}>
                  {ROTULO_CATEGORIA[c]}
                </option>
              ))}
            </Select>
            <Input
              rotulo="Link (opcional)"
              placeholder="/configuracoes"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              dica="Rota interna do MOVA, começando com /. Deixe em branco se não houver."
            />
          </div>
          <Input rotulo="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} required />
          <Textarea rotulo="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={1000} required />
          <div>
            <Button onClick={publicar} carregando={publicando}>
              Publicar
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-6">
        {!novidades ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((k) => (
              <Skeleton key={k} className="h-16" />
            ))}
          </div>
        ) : novidades.length === 0 ? (
          <EmptyState titulo="Nenhuma novidade publicada ainda." />
        ) : (
          <ul className="flex flex-col gap-2">
            {novidades.map((n) => (
              <li key={n.id}>
                <Card className="flex flex-col gap-1 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={CLASSE_CATEGORIA[n.categoria]}>{ROTULO_CATEGORIA[n.categoria]}</Badge>
                      <p className="text-sm font-medium text-ink-900">{n.titulo}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-ink-400">{formatoData.format(new Date(n.publicadoEm))}</p>
                      <button
                        type="button"
                        onClick={() => setParaExcluir(n)}
                        className="text-xs font-medium text-danger-600 hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-ink-600">{n.descricao}</p>
                  {n.link && <p className="text-xs text-ink-400">Link: {n.link}</p>}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        titulo="Remover novidade"
        mensagem={`Remover "${paraExcluir?.titulo}"? Ela deixa de aparecer para todo mundo, mesmo para quem já tinha marcado como lida.`}
        aberto={paraExcluir !== null}
        confirmando={excluindo}
        rotuloConfirmar="Remover"
        varianteConfirmar="perigo"
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setParaExcluir(null)}
      />
    </AdminLayout>
  );
}
