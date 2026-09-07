import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ApiError, adminApi } from "../../lib/api";
import type { UsuarioAdmin } from "../../lib/api";

const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export function AdminUsuariosPage() {
  const [termo, setTermo] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<UsuarioAdmin | null>(null);
  const [processando, setProcessando] = useState(false);

  function carregar(q?: string) {
    setCarregando(true);
    setErro(null);
    adminApi
      .listarUsuarios(q)
      .then((r) => {
        setUsuarios(r.usuarios);
        setTotal(r.total);
      })
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar os usuários."))
      .finally(() => setCarregando(false));
  }

  useEffect(() => carregar(), []);

  function aoBuscar(e: React.FormEvent) {
    e.preventDefault();
    carregar(termo.trim() || undefined);
  }

  async function confirmarAlteracao() {
    if (!alvo) return;
    setProcessando(true);
    try {
      await adminApi.alterarStatusUsuario(alvo.id, !alvo.ativo);
      setAlvo(null);
      carregar(termo.trim() || undefined);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível alterar o status do usuário.");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <AdminLayout>
      <PageHeader titulo="Usuários" subtitulo={`Visão global de todos os usuários da plataforma (${total}).`} />

      <Card className="mt-6">
        <form onSubmit={aoBuscar} className="flex flex-col gap-3 sm:flex-row">
          <Input rotulo="Buscar por nome ou e-mail" className="flex-1" value={termo} onChange={(e) => setTermo(e.target.value)} />
          <Button type="submit" className="sm:self-end">
            Buscar
          </Button>
        </form>
      </Card>

      {erro && (
        <div className="mt-4">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {carregando && (
        <div className="mt-6 flex flex-col gap-3">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-16" />
          ))}
        </div>
      )}

      {!carregando && usuarios.length === 0 && <EmptyState className="mt-6" titulo="Nenhum usuário encontrado." />}

      {!carregando && usuarios.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {usuarios.map((u) => (
            <li key={u.id}>
              <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-ink-900">{u.nome}</p>
                    {!u.ativo && <Badge className="bg-danger-100 text-danger-700">Desativado</Badge>}
                    {u.empresa.suspensa && <Badge className="bg-warning-100 text-warning-700">Empresa suspensa</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-500">
                    {u.email} · {u.empresa.nome}
                    {u.cargo ? ` · ${u.cargo}` : ""} · desde {formatoData.format(new Date(u.criadoEm))}
                  </p>
                </div>
                <Button variante={u.ativo ? "perigo" : "sucesso"} tamanho="sm" onClick={() => setAlvo(u)}>
                  {u.ativo ? "Desativar" : "Ativar"}
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        aberto={alvo !== null}
        titulo={alvo?.ativo ? "Desativar usuário" : "Ativar usuário"}
        mensagem={
          alvo
            ? alvo.ativo
              ? `${alvo.nome} não vai mais conseguir entrar no MOVA até ser reativado. Os dados dele não são apagados.`
              : `${alvo.nome} volta a conseguir entrar no MOVA normalmente.`
            : ""
        }
        rotuloConfirmar={alvo?.ativo ? "Desativar" : "Ativar"}
        varianteConfirmar={alvo?.ativo ? "perigo" : "sucesso"}
        confirmando={processando}
        aoConfirmar={confirmarAlteracao}
        aoCancelar={() => setAlvo(null)}
      />
    </AdminLayout>
  );
}
