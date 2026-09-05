import { useState } from "react";
import { Card, CardHeader } from "../ui/Card";
import { Alert } from "../ui/Alert";
import { cn } from "../../lib/cn";
import { ApiError, empresaApi } from "../../lib/api";
import { useModulos } from "../../context/ModulosContext";

/**
 * "Recursos do MOVA" (Etapa 5 — arquitetura modular) — cada empresa ativa só
 * o que faz sentido para o próprio negócio. Módulos essenciais (Clientes,
 * Produtos, Orçamentos) nem aparecem aqui: estão sempre disponíveis. Textos
 * em linguagem simples de propósito — nada de "módulo", "flag" ou jargão
 * técnico visível ao empreendedor.
 */
export function ModulosCard() {
  const { modulos, carregando, recarregar } = useModulos();
  const [alterando, setAlterando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const opcionais = modulos.filter((m) => !m.sempreAtivo);

  async function alternar(moduloId: string, ativoAtual: boolean) {
    setErro(null);
    setAlterando(moduloId);
    try {
      await empresaApi.alterarModulo(moduloId, !ativoAtual);
      await recarregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível alterar este recurso agora.");
    } finally {
      setAlterando(null);
    }
  }

  if (carregando) return null;

  return (
    <Card>
      <CardHeader
        titulo="Recursos do MOVA"
        descricao="Ative só o que seu negócio usa — você pode mudar isso quando quiser. Desativar nunca apaga nenhum dado."
      />

      {erro && (
        <div className="mt-4">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      <ul className="mt-4 flex flex-col divide-y divide-ink-100">
        {opcionais.map((modulo) => {
          const desabilitadoPorImplementacao = !modulo.implementado;
          return (
            <li key={modulo.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">
                  {modulo.nome}
                  {desabilitadoPorImplementacao && (
                    <span className="ml-2 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-normal text-ink-500">Em breve</span>
                  )}
                </p>
                <p className="text-sm text-ink-500">{modulo.descricao}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={modulo.ativo}
                aria-label={`${modulo.ativo ? "Desativar" : "Ativar"} ${modulo.nome}`}
                disabled={desabilitadoPorImplementacao || alterando === modulo.id}
                onClick={() => alternar(modulo.id, modulo.ativo)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                  modulo.ativo ? "bg-brand-600" : "bg-ink-200"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    modulo.ativo ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
