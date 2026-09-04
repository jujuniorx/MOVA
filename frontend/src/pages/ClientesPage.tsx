import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { PageHeader } from "../components/ui/PageHeader";
import { ClienteFormModal } from "../components/clientes/ClienteFormModal";
import { ApiError, clientesApi } from "../lib/api";
import type { Cliente } from "../lib/api";

function IniciaisAvatar({ nome }: { nome: string }) {
  const iniciais = nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
      {iniciais || "?"}
    </span>
  );
}

function IconeClientes() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-4a4 4 0 100-8 4 4 0 000 8zm6 4a4 4 0 00-3-3.87m-8 3.87a4 4 0 013-3.87" />
    </svg>
  );
}

export function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null);

  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  function carregarClientes() {
    setCarregando(true);
    setErro(null);
    clientesApi
      .listar()
      .then(setClientes)
      .catch((erroCapturado) =>
        setErro(
          erroCapturado instanceof ApiError ? erroCapturado.message : "Não foi possível carregar os clientes."
        )
      )
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregarClientes();
  }, []);

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter((cliente) => cliente.nome.toLowerCase().includes(termo));
  }, [clientes, busca]);

  function abrirNovoCliente() {
    setClienteEmEdicao(null);
    setModalAberto(true);
  }

  function abrirEdicao(cliente: Cliente) {
    setClienteEmEdicao(cliente);
    setModalAberto(true);
  }

  function aoSalvarCliente() {
    setModalAberto(false);
    carregarClientes();
  }

  async function confirmarExclusao() {
    if (!clienteParaExcluir) return;
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await clientesApi.excluir(clienteParaExcluir.id);
      setClienteParaExcluir(null);
      carregarClientes();
    } catch (erroCapturado) {
      setErroExclusao(
        erroCapturado instanceof ApiError ? erroCapturado.message : "Não foi possível excluir o cliente."
      );
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <AppLayout>
      <PageHeader
        titulo={
          <>
            Clientes
            {!carregando && <span className="ml-2 text-sm font-normal text-ink-400">({clientes.length})</span>}
          </>
        }
        subtitulo="Cadastre e gerencie quem você atende."
        acao={
          <Button className="w-full sm:w-auto" onClick={abrirNovoCliente}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Novo cliente
          </Button>
        }
      />

      {!carregando && clientes.length > 0 && (
        <div className="relative mt-6 max-w-sm">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="search"
            placeholder="Buscar cliente pelo nome..."
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            className="w-full min-h-11 rounded-lg border border-ink-200 py-2.5 pl-9 pr-3 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
      )}

      {erro && (
        <div className="mt-6">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {carregando && (
        <div className="mt-6 flex flex-col gap-3">
          {[1, 2, 3].map((chave) => (
            <Skeleton key={chave} className="h-20" />
          ))}
        </div>
      )}

      {!carregando && !erro && clientes.length === 0 && (
        <EmptyState
          className="mt-6"
          icone={<IconeClientes />}
          titulo="Você ainda não tem clientes cadastrados."
          descricao="Cadastre seu primeiro cliente para começar a criar orçamentos."
          acao={
            <Button variante="secundario" onClick={abrirNovoCliente}>
              Cadastrar meu primeiro cliente
            </Button>
          }
        />
      )}

      {!carregando && clientes.length > 0 && clientesFiltrados.length === 0 && (
        <Card className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-ink-600">Nenhum cliente encontrado para "{busca}".</p>
          <button
            type="button"
            onClick={() => setBusca("")}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Limpar busca
          </button>
        </Card>
      )}

      {!carregando && clientesFiltrados.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3 motion-safe:animate-fade-in-up">
          {clientesFiltrados.map((cliente) => (
            <li key={cliente.id}>
              <Card className="flex flex-col gap-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <IniciaisAvatar nome={cliente.nome} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">{cliente.nome}</p>
                    <p className="mt-0.5 truncate text-sm text-ink-500">
                      {[cliente.whatsapp, cliente.telefone, cliente.email].filter(Boolean).join(" · ") ||
                        "Sem contato cadastrado"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button tamanho="sm" variante="secundario" onClick={() => abrirEdicao(cliente)}>
                    Editar
                  </Button>
                  <Button tamanho="sm" variante="perigo" onClick={() => setClienteParaExcluir(cliente)}>
                    Excluir
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ClienteFormModal
        aberto={modalAberto}
        clienteEmEdicao={clienteEmEdicao}
        aoFechar={() => setModalAberto(false)}
        aoSalvar={aoSalvarCliente}
      />

      <ConfirmDialog
        titulo="Excluir cliente"
        mensagem={
          erroExclusao ??
          `Tem certeza que deseja excluir "${clienteParaExcluir?.nome}"? Esta ação não pode ser desfeita.`
        }
        aberto={clienteParaExcluir !== null}
        confirmando={excluindo}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => {
          setClienteParaExcluir(null);
          setErroExclusao(null);
        }}
      />
    </AppLayout>
  );
}
