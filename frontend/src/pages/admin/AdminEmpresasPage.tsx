import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Card, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { cn } from "../../lib/cn";
import { ApiError, adminApi } from "../../lib/api";
import type { DuracaoAcessoEspecial, EmpresaAdmin, EmpresaAdminDetalhe, LogAuditoriaAdmin, StatusTecnico, PlanoTipo } from "../../lib/api";

const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const ROTULOS_DURACAO: Record<DuracaoAcessoEspecial, string> = {
  DIAS_15: "15 dias",
  DIAS_30: "30 dias",
  DIAS_90: "90 dias",
  ANO_1: "1 ano",
  VITALICIO: "Vitalício",
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>{children}</span>;
}

export function AdminEmpresasPage() {
  const [status, setStatus] = useState<StatusTecnico | null>(null);
  const [termo, setTermo] = useState("");
  const [campo, setCampo] = useState<"nome" | "id" | "email_admin">("nome");
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [empresaSelecionadaId, setEmpresaSelecionadaId] = useState<string | null>(null);

  function carregarLista(q?: string, c?: typeof campo) {
    setCarregando(true);
    setErro(null);
    adminApi
      .listarEmpresas(q, c)
      .then(setEmpresas)
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar as empresas."))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregarLista();
    adminApi.statusTecnico().then(setStatus).catch(() => setStatus(null));
  }, []);

  function aoBuscar(e: React.FormEvent) {
    e.preventDefault();
    carregarLista(termo.trim() || undefined, campo);
  }

  return (
    <AdminLayout>
      <PageHeader titulo="Empresas" subtitulo="Gestão administrativa da plataforma MOVA." />

      {status && (
        <Card className="mt-4">
          <CardHeader titulo="Status técnico" descricao="Visão geral das integrações e da plataforma." />
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-ink-500">Empresas</p>
              <p className="text-lg font-semibold text-ink-900">{status.totalEmpresas}</p>
            </div>
            <div>
              <p className="text-xs text-ink-500">Suspensas</p>
              <p className="text-lg font-semibold text-ink-900">{status.empresasSuspensas}</p>
            </div>
            <div>
              <p className="text-xs text-ink-500">Mercado Livre conectados</p>
              <p className="text-lg font-semibold text-ink-900">{status.integracoes.mercadoLivre.empresasConectadas}</p>
            </div>
            <div>
              <p className="text-xs text-ink-500">WhatsApp conectados</p>
              <p className="text-lg font-semibold text-ink-900">{status.integracoes.whatsapp.empresasConectadas}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(status.integracoes).map(([nome, info]) => (
              <Badge key={nome} className={info.configurado ? "bg-success-100 text-success-700" : "bg-ink-100 text-ink-500"}>
                {nome}: {info.configurado ? "configurado" : "não configurado"}
              </Badge>
            ))}
            {status.erros.notificacoesMercadoLivreComErro > 0 && (
              <Badge className="bg-danger-100 text-danger-700">
                {status.erros.notificacoesMercadoLivreComErro} notificação(ões) do Mercado Livre com erro
              </Badge>
            )}
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <form onSubmit={aoBuscar} className="flex flex-col gap-3 sm:flex-row">
          <Select className="sm:w-56" value={campo} onChange={(e) => setCampo(e.target.value as typeof campo)}>
            <option value="nome">Nome da empresa</option>
            <option value="id">ID da empresa</option>
            <option value="email_admin">E-mail do administrador</option>
          </Select>
          <Input rotulo="Termo de busca" className="flex-1" placeholder="Buscar..." value={termo} onChange={(e) => setTermo(e.target.value)} />
          <Button type="submit">Buscar</Button>
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

      {!carregando && empresas.length === 0 && <EmptyState className="mt-6" titulo="Nenhuma empresa encontrada." />}

      {!carregando && empresas.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {empresas.map((empresa) => (
            <li key={empresa.id}>
              <Card
                className="flex cursor-pointer flex-col gap-2 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                onClick={() => setEmpresaSelecionadaId(empresa.id)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-900">{empresa.nome}</p>
                    {empresa.suspensa && <Badge className="bg-danger-100 text-danger-700">Suspensa</Badge>}
                    <Badge className="bg-ink-100 text-ink-600">{empresa.planoTipo}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {empresa._count.usuarios} usuário(s) · {empresa._count.clientes} clientes · {empresa._count.produtos} produtos · {empresa._count.orcamentos} orçamentos
                  </p>
                </div>
                <p className="text-xs text-ink-400">Desde {formatoData.format(new Date(empresa.criadoEm))}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <DetalheEmpresaModal
        empresaId={empresaSelecionadaId}
        aoFechar={() => setEmpresaSelecionadaId(null)}
        aoAtualizar={() => carregarLista(termo.trim() || undefined, campo)}
      />
    </AdminLayout>
  );
}

function DetalheEmpresaModal({
  empresaId,
  aoFechar,
  aoAtualizar,
}: {
  empresaId: string | null;
  aoFechar: () => void;
  aoAtualizar: () => void;
}) {
  const [detalhe, setDetalhe] = useState<EmpresaAdminDetalhe | null>(null);
  const [auditoria, setAuditoria] = useState<LogAuditoriaAdmin[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [acao, setAcao] = useState<"nenhuma" | "suspender" | "conceder">("nenhuma");
  const [motivoSuspensao, setMotivoSuspensao] = useState("");
  const [planoEspecial, setPlanoEspecial] = useState<Exclude<PlanoTipo, "GRATUITO">>("START");
  const [duracaoEspecial, setDuracaoEspecial] = useState<DuracaoAcessoEspecial>("DIAS_30");
  const [motivoEspecial, setMotivoEspecial] = useState("");
  const [processando, setProcessando] = useState(false);

  function carregar() {
    if (!empresaId) return;
    setCarregando(true);
    setErro(null);
    setAcao("nenhuma");
    Promise.all([adminApi.obterEmpresa(empresaId), adminApi.auditoriaEmpresa(empresaId)])
      .then(([d, a]) => {
        setDetalhe(d);
        setAuditoria(a);
      })
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar a empresa."))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, [empresaId]);

  async function suspender() {
    if (!empresaId || !motivoSuspensao.trim()) return;
    setProcessando(true);
    setErro(null);
    try {
      await adminApi.suspenderEmpresa(empresaId, motivoSuspensao.trim());
      setMotivoSuspensao("");
      carregar();
      aoAtualizar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível suspender.");
    } finally {
      setProcessando(false);
    }
  }

  async function reativar() {
    if (!empresaId) return;
    setProcessando(true);
    setErro(null);
    try {
      await adminApi.reativarEmpresa(empresaId);
      carregar();
      aoAtualizar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível reativar.");
    } finally {
      setProcessando(false);
    }
  }

  async function concederAcesso() {
    if (!empresaId) return;
    setProcessando(true);
    setErro(null);
    try {
      await adminApi.concederAcessoEspecial(empresaId, { planoTipo: planoEspecial, duracao: duracaoEspecial, motivo: motivoEspecial.trim() || undefined });
      setMotivoEspecial("");
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível conceder o acesso especial.");
    } finally {
      setProcessando(false);
    }
  }

  async function revogarAcesso() {
    if (!empresaId) return;
    setProcessando(true);
    setErro(null);
    try {
      await adminApi.revogarAcessoEspecial(empresaId);
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível revogar o acesso especial.");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Modal titulo={detalhe?.empresa.nome ?? "Empresa"} aberto={empresaId !== null} aoFechar={aoFechar} tamanho="grande">
      {carregando && <Skeleton className="h-40" />}
      {erro && (
        <div className="mb-4">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {!carregando && detalhe && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase text-ink-500">Plano comercial</p>
              <p className="mt-1 text-sm font-medium text-ink-900">{detalhe.planoComercial.planoTipo}</p>
              <p className="text-xs text-ink-500">{detalhe.planoComercial.cicloFaturamento}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase text-ink-500">Acesso especial</p>
              {detalhe.acessoEspecial ? (
                <>
                  <p className="mt-1 text-sm font-medium text-ink-900">{detalhe.acessoEspecial.planoTipo}</p>
                  <p className="text-xs text-ink-500">
                    {ROTULOS_DURACAO[detalhe.acessoEspecial.duracao]}
                    {detalhe.acessoEspecial.expiraEm ? ` · até ${formatoData.format(new Date(detalhe.acessoEspecial.expiraEm))}` : ""}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-ink-400">Nenhum</p>
              )}
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase text-ink-500">Cobrança</p>
              <p className="mt-1 text-sm font-medium text-ink-900">{detalhe.cobranca}</p>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {detalhe.empresa.suspensa ? (
              <Badge className="bg-danger-100 text-danger-700">
                Suspensa{detalhe.empresa.suspensaMotivo ? `: ${detalhe.empresa.suspensaMotivo}` : ""}
              </Badge>
            ) : (
              <Badge className="bg-success-100 text-success-700">Ativa</Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {!detalhe.empresa.suspensa ? (
              <Button variante="perigo" tamanho="sm" onClick={() => setAcao(acao === "suspender" ? "nenhuma" : "suspender")}>
                Suspender empresa
              </Button>
            ) : (
              <Button variante="sucesso" tamanho="sm" onClick={reativar} carregando={processando}>
                Reativar empresa
              </Button>
            )}
            <Button variante="secundario" tamanho="sm" onClick={() => setAcao(acao === "conceder" ? "nenhuma" : "conceder")}>
              Conceder acesso especial
            </Button>
            {detalhe.acessoEspecial && (
              <Button variante="secundario" tamanho="sm" onClick={revogarAcesso} carregando={processando}>
                Revogar acesso especial
              </Button>
            )}
          </div>

          {acao === "suspender" && (
            <Card className="flex flex-col gap-3 border-danger-600 p-4">
              <Input rotulo="Motivo da suspensão" value={motivoSuspensao} onChange={(e) => setMotivoSuspensao(e.target.value)} required />
              <Button variante="perigo" onClick={suspender} carregando={processando} disabled={!motivoSuspensao.trim()} className="w-fit">
                Confirmar suspensão
              </Button>
            </Card>
          )}

          {acao === "conceder" && (
            <Card className="flex flex-col gap-3 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select rotulo="Plano" value={planoEspecial} onChange={(e) => setPlanoEspecial(e.target.value as Exclude<PlanoTipo, "GRATUITO">)}>
                  <option value="START">Start</option>
                  <option value="BUSINESS">Business</option>
                  <option value="PRO">Pro</option>
                </Select>
                <Select rotulo="Duração" value={duracaoEspecial} onChange={(e) => setDuracaoEspecial(e.target.value as DuracaoAcessoEspecial)}>
                  {Object.entries(ROTULOS_DURACAO).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </Select>
              </div>
              <Input rotulo="Motivo (opcional)" value={motivoEspecial} onChange={(e) => setMotivoEspecial(e.target.value)} />
              <Button onClick={concederAcesso} carregando={processando} className="w-fit">
                Conceder
              </Button>
            </Card>
          )}

          <div>
            <p className="text-sm font-semibold text-ink-900">Auditoria desta empresa</p>
            {auditoria.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">Nenhuma ação administrativa registrada.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {auditoria.map((log) => (
                  <li key={log.id} className="rounded-lg bg-ink-50 px-3 py-2 text-sm">
                    <p className="font-medium text-ink-900">{log.acao}</p>
                    <p className="text-xs text-ink-500">
                      {log.admin.nome} · {formatoData.format(new Date(log.criadoEm))}
                      {log.motivo ? ` · ${log.motivo}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
