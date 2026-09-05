import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buscaApi } from "../../lib/api";
import type { ResultadoBusca } from "../../lib/api";
import { useModulos } from "../../context/ModulosContext";

function IconeBusca() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m20 20-3.5-3.5" />
    </svg>
  );
}

function IconePara(tipo: ResultadoBusca["tipo"]) {
  const paths: Record<ResultadoBusca["tipo"], string> = {
    cliente: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-4a4 4 0 100-8 4 4 0 000 8zm6 4a4 4 0 00-3-3.87m-8 3.87a4 4 0 013-3.87",
    produto: "m12 3 8 4.5v9L12 21l-8-4.5v-9zM4 7.5 12 12l8-4.5M12 12v9",
    orcamento: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z",
    venda: "M3 9.5 12 4l9 5.5M4 9v10a1 1 0 0 0 1 1h4v-6h6v6h4a1 1 0 0 0 1-1V9",
    pedido: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  };
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[tipo]} />
    </svg>
  );
}

const RUBRICA_TIPO: Record<ResultadoBusca["tipo"], string> = {
  cliente: "Clientes",
  produto: "Produtos",
  orcamento: "Orçamentos",
  venda: "Vendas",
  pedido: "Pedidos",
};

interface AcaoRapida {
  chave: string;
  rotulo: string;
  rota: string;
}

export function BuscaGlobal({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const navigate = useNavigate();
  const { moduloAtivo } = useModulos();
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aberto) {
      setTermo("");
      setResultados([]);
      // Foco só depois do modal montar, senão o input ainda não existe.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    if (termo.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const timeout = setTimeout(() => {
      buscaApi
        .buscar(termo.trim())
        .then((r) => setResultados(r.resultados))
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [termo, aberto]);

  useEffect(() => {
    if (!aberto) return;
    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", aoPressionarTecla);
    return () => document.removeEventListener("keydown", aoPressionarTecla);
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  function ir(rota: string) {
    navigate(rota);
    aoFechar();
  }

  const acoesRapidas: AcaoRapida[] = [
    { chave: "cliente", rotulo: "Novo cliente", rota: "/clientes?novo=1" },
    { chave: "produto", rotulo: "Novo produto", rota: "/produtos?novo=1" },
    { chave: "orcamento", rotulo: "Novo orçamento", rota: "/orcamentos/novo" },
    ...(moduloAtivo("vendas") ? [{ chave: "venda", rotulo: "Nova venda", rota: "/operacoes?aba=vendas" }] : []),
    ...(moduloAtivo("pedidos") ? [{ chave: "pedido", rotulo: "Novo pedido", rota: "/operacoes?aba=pedidos" }] : []),
  ];

  const grupos = (["cliente", "produto", "orcamento", "venda", "pedido"] as const)
    .map((tipo) => ({ tipo, itens: resultados.filter((r) => r.tipo === tipo) }))
    .filter((grupo) => grupo.itens.length > 0);

  const mostrarAcoesRapidas = termo.trim().length < 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[12vh] motion-safe:animate-fade-in"
      onClick={aoFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
        className="flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-surface shadow-xl motion-safe:animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3">
          <span className="text-ink-400">
            <IconeBusca />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar clientes, produtos, orçamentos..."
            className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-ink-200 px-1.5 py-0.5 text-xs text-ink-400 sm:inline-block">Esc</kbd>
        </div>

        <div className="overflow-y-auto">
          {mostrarAcoesRapidas && (
            <div className="p-2">
              <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Ações rápidas</p>
              <ul>
                {acoesRapidas.map((acao) => (
                  <li key={acao.chave}>
                    <button
                      type="button"
                      onClick={() => ir(acao.rota)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-100"
                    >
                      {acao.rotulo}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!mostrarAcoesRapidas && buscando && <p className="px-4 py-6 text-center text-sm text-ink-500">Buscando...</p>}

          {!mostrarAcoesRapidas && !buscando && grupos.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-ink-500">Nada encontrado para "{termo.trim()}".</p>
          )}

          {!mostrarAcoesRapidas &&
            grupos.map((grupo) => (
              <div key={grupo.tipo} className="p-2">
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">{RUBRICA_TIPO[grupo.tipo]}</p>
                <ul>
                  {grupo.itens.map((item) => (
                    <li key={`${item.tipo}-${item.id}`}>
                      <button
                        type="button"
                        onClick={() => ir(item.rota)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-ink-100"
                      >
                        <span className="text-ink-400">{IconePara(item.tipo)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink-900">{item.titulo}</span>
                          <span className="block truncate text-xs text-ink-500">{item.subtitulo}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
