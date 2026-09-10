import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { novidadesApi } from "../../lib/api";
import type { CategoriaNovidade, Novidade } from "../../lib/api";
import { cn } from "../../lib/cn";

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

const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export function NovidadesPanel({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const navigate = useNavigate();
  const [itens, setItens] = useState<Novidade[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!aberto) return;
    setCarregando(true);
    novidadesApi
      .listar()
      .then((r) => setItens(r.itens))
      .catch(() => setItens([]))
      .finally(() => setCarregando(false));
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", aoPressionarTecla);
    return () => document.removeEventListener("keydown", aoPressionarTecla);
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  function aoClicarNovidade(novidade: Novidade) {
    if (!novidade.lida) {
      setItens((atual) => atual.map((n) => (n.id === novidade.id ? { ...n, lida: true } : n)));
      novidadesApi.marcarLida(novidade.id).catch(() => {});
    }
    if (novidade.link) {
      navigate(novidade.link);
      aoFechar();
    }
  }

  async function marcarTodasLidas() {
    setItens((atual) => atual.map((n) => ({ ...n, lida: true })));
    await novidadesApi.marcarTodasLidas().catch(() => {});
  }

  const temNaoLidas = itens.some((n) => !n.lida);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[12vh] motion-safe:animate-fade-in"
      onClick={aoFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Novidades do MOVA"
        className="flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-surface shadow-xl motion-safe:animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
          <p className="text-sm font-semibold text-ink-900">Novidades do MOVA</p>
          {temNaoLidas && (
            <button type="button" onClick={marcarTodasLidas} className="text-xs font-medium text-brand-700 hover:underline">
              Marcar tudo como lido
            </button>
          )}
        </div>

        <div className="overflow-y-auto">
          {carregando && <p className="px-4 py-6 text-center text-sm text-ink-500">Carregando...</p>}

          {!carregando && itens.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-ink-500">Nenhuma novidade por aqui ainda.</p>
          )}

          {!carregando && itens.length > 0 && (
            <ul className="divide-y divide-ink-100">
              {itens.map((novidade) => (
                <li key={novidade.id}>
                  <button
                    type="button"
                    onClick={() => aoClicarNovidade(novidade)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-ink-50"
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        novidade.lida ? "bg-transparent" : "bg-brand-600"
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", CLASSE_CATEGORIA[novidade.categoria])}>
                          {ROTULO_CATEGORIA[novidade.categoria]}
                        </span>
                        <span className="text-xs text-ink-400">{formatoData.format(new Date(novidade.publicadoEm))}</span>
                      </div>
                      <p className={cn("mt-1 text-sm", novidade.lida ? "font-medium text-ink-700" : "font-semibold text-ink-900")}>
                        {novidade.titulo}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-500">{novidade.descricao}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
