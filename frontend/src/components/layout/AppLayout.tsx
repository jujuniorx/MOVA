import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Logo, LogoSimbolo } from "../Logo";
import { ThemeToggle } from "../ui/ThemeToggle";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { BuscaGlobal } from "../busca/BuscaGlobal";
import { NovidadesPanel } from "../novidades/NovidadesPanel";
import { useAuth } from "../../context/AuthContext";
import { useModulos } from "../../context/ModulosContext";
import { novidadesApi } from "../../lib/api";
import { cn } from "../../lib/cn";

type Caminho = "/painel" | "/orcamentos" | "/clientes" | "/produtos" | "/operacoes" | "/indicacoes-clientes" | "/configuracoes";

function IconeInicio() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function IconeOrcamentos() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
    </svg>
  );
}

function IconeClientes() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.87M16.5 3.87a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconeProdutos() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM4 7.5 12 12l8-4.5M12 12v9" />
    </svg>
  );
}

function IconeIndicacoes() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.5 3 15l1.5-4.5L3 6l5.5 2.5L12 5l3.5 3.5L21 6l-1.5 4.5L21 15l-5.5-2.5L12 16z" />
    </svg>
  );
}

function IconeSino() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconeConfig() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.4 14.5.9 1.5-2.4 2.4-1.5-.9a6 6 0 0 1-1.6.9l-.4 1.7h-3.4l-.4-1.7a6 6 0 0 1-1.6-.9l-1.5.9L5.1 16l.9-1.5a6 6 0 0 1 0-1.9L5.1 11 7.5 8.6l1.5.9a6 6 0 0 1 1.6-.9L11 6.9h3.4l.4 1.7a6 6 0 0 1 1.6.9l1.5-.9 2.4 2.4-.9 1.5a6 6 0 0 1 0 2" />
    </svg>
  );
}

function IconeOperacoes() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5 12 4l9 5.5M4 9v10a1 1 0 0 0 1 1h4v-6h6v6h4a1 1 0 0 0 1-1V9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 13h.01M16 13h.01" />
    </svg>
  );
}

function IconeBusca() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m20 20-3.5-3.5" />
    </svg>
  );
}

function IconeMais() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconeMaisMenu() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6h.01M12 12h.01M12 18h.01" />
    </svg>
  );
}

// "Operações" reúne Estoque/Vendas/Pedidos/Devoluções em abas internas — só
// faz sentido aparecer se pelo menos um desses módulos estiver ativo (ver
// ModulosContext). Os demais itens são núcleo do MOVA, sempre visíveis.
const itensNavBase: Array<{ rotulo: string; caminho: Caminho; icone: ReactNode; requerAlgumModulo?: string[] }> = [
  { rotulo: "Início", caminho: "/painel", icone: <IconeInicio /> },
  { rotulo: "Orçamentos", caminho: "/orcamentos", icone: <IconeOrcamentos /> },
  { rotulo: "Clientes", caminho: "/clientes", icone: <IconeClientes /> },
  { rotulo: "Produtos", caminho: "/produtos", icone: <IconeProdutos /> },
  { rotulo: "Operações", caminho: "/operacoes", icone: <IconeOperacoes />, requerAlgumModulo: ["estoque", "vendas", "pedidos"] },
  { rotulo: "Indicações", caminho: "/indicacoes-clientes", icone: <IconeIndicacoes /> },
  { rotulo: "Configurações", caminho: "/configuracoes", icone: <IconeConfig /> },
];

function iniciais(nome?: string) {
  if (!nome) return "M";
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { usuario, empresa, sair } = useAuth();
  const { moduloAtivo } = useModulos();
  const [maisAberto, setMaisAberto] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [novidadesAberto, setNovidadesAberto] = useState(false);
  const [novidadesNaoLidas, setNovidadesNaoLidas] = useState(0);
  const location = useLocation();
  const caminhoAtual = location.pathname;

  useEffect(() => {
    function aoPressionarTecla(evento: KeyboardEvent) {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        setBuscaAberta(true);
      }
    }
    document.addEventListener("keydown", aoPressionarTecla);
    return () => document.removeEventListener("keydown", aoPressionarTecla);
  }, []);

  useEffect(() => {
    novidadesApi
      .listar()
      .then((r) => setNovidadesNaoLidas(r.naoLidas))
      .catch(() => {});
  }, []);

  // Fechar o painel some com o "não lidas" residual assim que a pessoa abre
  // (o próprio painel marca cada item lido ao clicar) — aqui só zera o badge
  // pra não ficar pedindo atenção de novo por algo que ela já viu.
  function aoFecharNovidades() {
    setNovidadesAberto(false);
    novidadesApi.listar().then((r) => setNovidadesNaoLidas(r.naoLidas)).catch(() => {});
  }

  const itensNav = itensNavBase.filter((item) => !item.requerAlgumModulo || item.requerAlgumModulo.some(moduloAtivo));
  // No mobile só cabem 2 destinos + a ação central — o restante entra em "Mais".
  const itensNavMobilePrincipais = itensNav.slice(0, 2);
  const itensNavMobileSecundarios = itensNav.slice(2);

  function ativo(caminho: string) {
    return caminhoAtual === caminho || caminhoAtual.startsWith(`${caminho}/`);
  }

  const classeItemLateral = (estaAtivo: boolean) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
      estaAtivo
        ? "bg-brand-50 text-brand-800 ring-1 ring-brand-200"
        : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
    );

  return (
    <div className="min-h-svh bg-ink-50">
      {/* Barra lateral — desktop e notebook */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-200 bg-surface lg:flex">
        <div className="px-5 py-5">
          <Link
            to="/painel"
            className="inline-flex rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Logo />
          </Link>
        </div>

        <div className="flex flex-col gap-2 px-4">
          <Link
            to="/orcamentos/novo"
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-colors duration-150 hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:bg-[#176d66] dark:hover:bg-[#12544f]"
          >
            <IconeMais />
            Novo orçamento
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBuscaAberta(true)}
              className="flex min-h-9 flex-1 items-center gap-2 rounded-lg border border-ink-200 px-3 text-sm text-ink-500 transition-colors duration-150 hover:bg-ink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <IconeBusca />
              <span className="flex-1 text-left">Buscar...</span>
              <kbd className="rounded border border-ink-200 px-1.5 py-0.5 text-xs text-ink-400">Ctrl K</kbd>
            </button>
            <button
              type="button"
              onClick={() => setNovidadesAberto(true)}
              aria-label="Novidades do MOVA"
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition-colors duration-150 hover:bg-ink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <IconeSino />
              {novidadesNaoLidas > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger-600" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-1 px-4">
          {itensNav.map((item) => (
            <NavLink
              key={item.caminho}
              to={item.caminho}
              className={() =>
                cn(
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  classeItemLateral(ativo(item.caminho))
                )
              }
            >
              <span className="shrink-0">{item.icone}</span>
              <span className="truncate">{item.rotulo}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-ink-200 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#141818] text-xs font-bold text-white">
              {iniciais(empresa?.nome)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">{empresa?.nome}</p>
              <p className="truncate text-xs text-ink-500">{usuario?.nome}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmandoSaida(true)}
              className="min-h-10 flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition-colors duration-150 hover:bg-ink-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              Sair
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Cabeçalho — celular e tablet */}
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-surface/95 backdrop-blur-[2px] lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/painel"
            className="inline-flex min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Logo />
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setBuscaAberta(true)}
              aria-label="Buscar"
              className="rounded-lg border border-ink-200 p-2 text-ink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <IconeBusca />
            </button>
            <button
              type="button"
              onClick={() => setNovidadesAberto(true)}
              aria-label="Novidades do MOVA"
              className="relative rounded-lg border border-ink-200 p-2 text-ink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <IconeSino />
              {novidadesNaoLidas > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger-600" aria-hidden="true" />
              )}
            </button>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setConfirmandoSaida(true)}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:max-w-6xl lg:pb-12 xl:px-10">
          <div key={caminhoAtual} className="motion-safe:animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Navegação inferior — celular */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {itensNavMobilePrincipais.map((item) => (
            <Link
              key={item.caminho}
              to={item.caminho}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150",
                ativo(item.caminho) ? "text-brand-700" : "text-ink-500"
              )}
            >
              {item.icone}
              {item.rotulo}
            </Link>
          ))}

          <Link
            to="/orcamentos/novo"
            aria-label="Novo orçamento"
            className="flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-ink-700"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-white dark:bg-[#176d66]">
              <IconeMais />
            </span>
          </Link>

          {itensNavMobileSecundarios.slice(0, 1).map((item) => (
            <Link
              key={item.caminho}
              to={item.caminho}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150",
                ativo(item.caminho) ? "text-brand-700" : "text-ink-500"
              )}
            >
              {item.icone}
              {item.rotulo}
            </Link>
          ))}

          <button
            type="button"
            onClick={() => setMaisAberto(true)}
            aria-haspopup="true"
            aria-expanded={maisAberto}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150",
              maisAberto ? "text-brand-700" : "text-ink-500"
            )}
          >
            <IconeMaisMenu />
            Mais
          </button>
        </div>
      </nav>

      {/* Painel "Mais" — funcionalidades secundárias no mobile */}
      {maisAberto && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-black/40 lg:hidden motion-safe:animate-fade-in"
          onClick={() => setMaisAberto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mais opções"
            onClick={(evento) => evento.stopPropagation()}
            className="w-full rounded-t-2xl bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl motion-safe:animate-fade-in-up"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-200" />
            <div className="flex items-center gap-3 border-b border-ink-100 px-1 pb-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#141818] text-xs font-bold text-white">
                {iniciais(empresa?.nome)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">{empresa?.nome}</p>
                <p className="truncate text-xs text-ink-500">{usuario?.nome}</p>
              </div>
            </div>
            <nav className="flex flex-col gap-1 pt-3">
              {itensNavMobileSecundarios.slice(1).map((item) => (
                <Link
                  key={item.caminho}
                  to={item.caminho}
                  onClick={() => setMaisAberto(false)}
                  className={classeItemLateral(ativo(item.caminho))}
                >
                  <span className="shrink-0">{item.icone}</span>
                  {item.rotulo}
                </Link>
              ))}
            </nav>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmandoSaida(true)}
                className="min-h-10 flex-1 rounded-lg border border-ink-200 px-3 py-2.5 text-sm font-medium text-ink-700"
              >
                Sair
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        titulo="Sair do MOVA"
        mensagem="Tem certeza que deseja sair do MOVA?"
        aberto={confirmandoSaida}
        rotuloConfirmar="Sair"
        varianteConfirmar="perigo"
        aoConfirmar={sair}
        aoCancelar={() => setConfirmandoSaida(false)}
      />

      <BuscaGlobal aberto={buscaAberta} aoFechar={() => setBuscaAberta(false)} />
      <NovidadesPanel aberto={novidadesAberto} aoFechar={aoFecharNovidades} />

      <span className="hidden">
        <LogoSimbolo />
      </span>
    </div>
  );
}
