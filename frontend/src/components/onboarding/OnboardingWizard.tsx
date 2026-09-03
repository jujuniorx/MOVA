import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { empresaApi } from "../../lib/api";

const EXEMPLOS_PRODUTO = [
  "Portão",
  "Armário planejado",
  "Ensaio fotográfico",
  "Tatuagem",
  "Higienização de sofá",
];

function Progresso({ passoAtual }: { passoAtual: number }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-1.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="flex items-center">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
              n < passoAtual
                ? "bg-facil-600 text-white"
                : n === passoAtual
                  ? "bg-facil-600 text-white ring-4 ring-facil-100"
                  : "bg-slate-100 text-slate-400"
            }`}
          >
            {n < passoAtual ? "✓" : n}
          </span>
          {n < 5 && (
            <span className={`h-0.5 w-4 sm:w-8 ${n < passoAtual ? "bg-facil-600" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function Controles({
  aoVoltar,
  aoPular,
  aoContinuar,
  rotuloContinuar = "Continuar",
  mostrarVoltar = true,
  mostrarPular = true,
}: {
  aoVoltar: () => void;
  aoPular: () => void;
  aoContinuar: () => void;
  rotuloContinuar?: string;
  mostrarVoltar?: boolean;
  mostrarPular?: boolean;
}) {
  return (
    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
      {mostrarVoltar ? (
        <button type="button" onClick={aoVoltar} className="text-sm font-medium text-slate-500 hover:text-slate-700">
          Voltar
        </button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-4">
        {mostrarPular && (
          <button type="button" onClick={aoPular} className="text-sm font-medium text-slate-500 hover:text-slate-700">
            Pular etapa
          </button>
        )}
        <Button onClick={aoContinuar}>{rotuloContinuar}</Button>
      </div>
    </div>
  );
}

interface OnboardingWizardProps {
  aoFechar: () => void;
}

export function OnboardingWizard({ aoFechar }: OnboardingWizardProps) {
  const [indice, setIndice] = useState(0); // 0 = boas-vindas, 1-5 = passos, 6 = conclusão
  const navigate = useNavigate();
  const { atualizarEmpresa } = useAuth();

  function avancar() {
    setIndice((atual) => Math.min(atual + 1, 6));
  }

  function voltar() {
    setIndice((atual) => Math.max(atual - 1, 0));
  }

  function finalizar() {
    aoFechar();
    empresaApi
      .atualizar({ onboardingConcluido: true })
      .then(atualizarEmpresa)
      .catch(() => {
        // não bloqueia o uso do sistema se isso falhar — na pior das
        // hipóteses o tour aparece de novo na próxima visita
      });
  }

  function irPara(caminho: string) {
    finalizar();
    navigate(caminho);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 motion-safe:animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl bg-white p-6 shadow-xl motion-safe:animate-fade-in-up sm:p-8">
        <button
          type="button"
          onClick={finalizar}
          aria-label="Sair do tour"
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {indice >= 1 && indice <= 5 && (
          <div className="mb-6">
            <Progresso passoAtual={indice} />
          </div>
        )}

        {indice === 0 && (
          <div className="text-center">
            <p className="text-4xl">👋</p>
            <h2 className="mt-3 text-xl font-bold text-slate-900">Vamos deixar seu OrçaFácil pronto?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Vamos configurar algumas coisas juntos. É rápido e você pode pular e voltar depois.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <Button onClick={avancar} className="w-full sm:w-auto">
                Vamos começar
              </Button>
              <button type="button" onClick={finalizar} className="text-sm font-medium text-slate-500 hover:text-slate-700">
                Pular por enquanto
              </button>
            </div>
          </div>
        )}

        {indice === 1 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900">1. Primeiro, vamos conhecer sua empresa.</h2>
            <p className="mt-2 text-sm text-slate-600">
              Essas informações aparecem no orçamento que seu cliente recebe: nome, contato, logo e
              cores.
            </p>

            <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orca-900 text-sm font-semibold text-white">
                E
              </span>
              <div>
                <p className="text-sm font-semibold text-orca-800">Sua empresa</p>
                <p className="text-xs text-slate-500">(11) 91234-5678 · contato@suaempresa.com</p>
              </div>
            </div>

            <div className="mt-5">
              <Button onClick={() => irPara("/configuracoes")} className="w-full sm:w-auto">
                Configurar minha empresa
              </Button>
            </div>

            <Controles aoVoltar={voltar} aoPular={avancar} aoContinuar={avancar} mostrarVoltar={false} />
          </div>
        )}

        {indice === 2 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900">2. Agora vamos cadastrar o que sua empresa vende.</h2>
            <p className="mt-2 text-sm text-slate-600">Pode ser um produto ou um serviço.</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {EXEMPLOS_PRODUTO.map((exemplo) => (
                <span
                  key={exemplo}
                  className="rounded-full bg-facil-50 px-3 py-1 text-xs font-medium text-facil-700"
                >
                  {exemplo}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              São só exemplos — você cadastra o que fizer sentido para o seu negócio.
            </p>

            <div className="mt-5">
              <Button onClick={() => irPara("/produtos?novo=1")} className="w-full sm:w-auto">
                Cadastrar produto ou serviço
              </Button>
            </div>

            <Controles aoVoltar={voltar} aoPular={avancar} aoContinuar={avancar} />
          </div>
        )}

        {indice === 3 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900">3. Diga o que você precisa saber do cliente.</h2>
            <p className="mt-2 text-sm text-slate-600">
              Cada serviço pode precisar de informações diferentes. Você escolhe o que precisa saber
              para conseguir fazer seu orçamento.
            </p>

            <div className="mt-4 rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-900">Exemplo: Portão</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {["Largura", "Altura", "Tipo de ferro", "Acabamento"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-facil-600" fill="none" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-3 text-sm font-medium text-orca-800">
              Você decide o que perguntar. O OrçaFácil organiza para você.
            </p>

            <div className="mt-5">
              <Button onClick={() => irPara("/produtos?novo=1")} className="w-full sm:w-auto">
                Ver como funciona
              </Button>
            </div>

            <Controles aoVoltar={voltar} aoPular={avancar} aoContinuar={avancar} />
          </div>
        )}

        {indice === 4 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900">4. Agora vamos criar seu primeiro orçamento.</h2>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-xs font-medium text-slate-600 sm:gap-2 sm:text-sm">
              {["Cliente", "Produto/serviço", "Informações", "Valor", "Revisar"].map((etapa, i, lista) => (
                <span key={etapa} className="flex items-center gap-1.5 sm:gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">{etapa}</span>
                  {i < lista.length - 1 && <span className="text-slate-300">→</span>}
                </span>
              ))}
            </div>

            <div className="mt-5">
              <Button onClick={() => irPara("/orcamentos/novo")} className="w-full sm:w-auto">
                Criar orçamento
              </Button>
            </div>

            <Controles aoVoltar={voltar} aoPular={avancar} aoContinuar={avancar} />
          </div>
        )}

        {indice === 5 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900">5. Seu orçamento está pronto!</h2>
            <p className="mt-2 text-sm text-slate-600">
              Agora você pode enviar para seu cliente pelo WhatsApp.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#25D366]/10 p-4 text-sm text-slate-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[#25D366]" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 004.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2z" />
              </svg>
              Compartilhar pelo WhatsApp também marca o orçamento como enviado, automaticamente.
            </div>

            <Controles aoVoltar={voltar} aoPular={avancar} aoContinuar={avancar} mostrarPular={false} />
          </div>
        )}

        {indice === 6 && (
          <div className="text-center">
            <p className="text-4xl">🎉</p>
            <h2 className="mt-3 text-xl font-bold text-slate-900">Tudo pronto!</h2>
            <p className="mt-2 text-sm text-slate-600">
              Seu OrçaFácil já está preparado para criar e enviar seus orçamentos.
            </p>
            <div className="mt-6">
              <Button onClick={finalizar} className="w-full sm:w-auto">
                Começar a usar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
