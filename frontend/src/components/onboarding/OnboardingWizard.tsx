import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Textarea";
import { Alert } from "../ui/Alert";
import { LogoSimbolo } from "../Logo";
import { useAuth } from "../../context/AuthContext";
import { ApiError, empresaApi } from "../../lib/api";
import type { PerfilOperacionalRascunho } from "../../lib/api";

const EXEMPLOS_PRODUTO = [
  "Portão",
  "Armário planejado",
  "Ensaio fotográfico",
  "Tatuagem",
  "Higienização de sofá",
];

const CONFIRMACAO_AO_CHEGAR: Record<number, { titulo: string; proximo: string }> = {
  2: {
    titulo: "Perfeito! Sua empresa está configurada.",
    proximo: "Próximo: cadastre o que você vende.",
  },
  3: {
    titulo: "Ótimo! Agora você já tem algo para vender.",
    proximo: "Próximo: diga o que você precisa saber do cliente.",
  },
  4: {
    titulo: "Show! Suas informações estão prontas.",
    proximo: "Próximo: vamos criar seu primeiro orçamento.",
  },
  5: {
    titulo: "Muito bem! Seu orçamento foi criado.",
    proximo: "Próximo: envie pelo WhatsApp.",
  },
};

function Progresso({ passoAtual }: { passoAtual: number }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-1.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="flex items-center">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
              n < passoAtual
                ? "bg-brand-600 text-white"
                : n === passoAtual
                  ? "bg-brand-600 text-white ring-4 ring-brand-100"
                  : "bg-ink-100 text-ink-400"
            }`}
          >
            {n < passoAtual ? (
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              n
            )}
          </span>
          {n < 5 && (
            <span className={`h-0.5 w-4 sm:w-8 ${n < passoAtual ? "bg-brand-600" : "bg-ink-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function TelaConfirmacao({
  indice,
  aoContinuar,
}: {
  indice: number;
  aoContinuar: () => void;
}) {
  const confirmacao = CONFIRMACAO_AO_CHEGAR[indice];
  if (!confirmacao) return null;
  return (
    <div className="py-4 text-center motion-safe:animate-fade-in">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-100 text-success-700">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <p className="mt-3 text-base font-semibold text-ink-900">{confirmacao.titulo}</p>
      <p className="mt-1 text-sm text-ink-500">{confirmacao.proximo}</p>
      <div className="mt-5">
        <Button onClick={aoContinuar}>Continuar →</Button>
      </div>
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
    <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-4">
      {mostrarVoltar ? (
        <button type="button" onClick={aoVoltar} className="text-sm font-medium text-ink-500 hover:text-ink-700">
          Voltar
        </button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-4">
        {mostrarPular && (
          <button type="button" onClick={aoPular} className="text-sm font-medium text-ink-500 hover:text-ink-700">
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
  passoInicial?: number;
}

export function OnboardingWizard({ aoFechar, passoInicial = 0 }: OnboardingWizardProps) {
  const [indice, setIndice] = useState(passoInicial); // 0 = boas-vindas, 1-5 = passos, 6 = conclusão
  const [confirmacoesVistas, setConfirmacoesVistas] = useState<Record<number, boolean>>({});
  // "Conte para o MOVA o que sua empresa faz" — pergunta feita só na tela de
  // boas-vindas (passo 0), não é um passo numerado novo (evitaria reindexar
  // tudo que já depende de 1-5). Fluxo obrigatório em dois passos: a
  // descrição livre só é INTERPRETADA (IA, ou heurística por palavra-chave
  // se a IA não estiver configurada) e mostrada em linguagem simples — só
  // quando o empresário clica "Continuar" é que os módulos são de fato
  // aplicados (rota /confirmar). Nada muda de verdade antes dessa confirmação.
  const [faseInicial, setFaseInicial] = useState<"pergunta" | "interpretando" | "confirmacao" | "aplicando">("pergunta");
  const [descricaoNegocio, setDescricaoNegocio] = useState("");
  const [perfilRascunho, setPerfilRascunho] = useState<PerfilOperacionalRascunho | null>(null);
  const [erroPerfil, setErroPerfil] = useState<string | null>(null);
  const navigate = useNavigate();
  const { empresa, atualizarEmpresa } = useAuth();

  const aguardandoConfirmacao = Boolean(CONFIRMACAO_AO_CHEGAR[indice]) && !confirmacoesVistas[indice];

  function confirmarChegada() {
    setConfirmacoesVistas((atual) => ({ ...atual, [indice]: true }));
  }

  // Se o tour já estava concluído quando o usuário abriu (ex.: "Rever tour"
  // em Configurações), isso é uma revisão — não deve alterar o progresso
  // salvo nem "reabrir" o aviso de continuar configuração para quem já
  // terminou.
  const modoRevisao = useRef(empresa?.onboardingConcluido === true).current;

  function concluirPasso(numeroPasso: number) {
    if (modoRevisao) return;
    const passoSalvo = empresa?.onboardingPasso ?? 0;
    if (numeroPasso <= passoSalvo) return;
    empresaApi
      .atualizar({ onboardingPasso: numeroPasso })
      .then(atualizarEmpresa)
      .catch(() => {
        // não bloqueia a navegação se isso falhar — o pior caso é o
        // progresso não avançar e a próxima visita pedir esse passo de novo
      });
  }

  function avancar() {
    if (indice >= 1 && indice <= 5) concluirPasso(indice);
    setIndice((atual) => Math.min(atual + 1, 6));
  }

  // Passo 1 do fluxo — chamado ao clicar "Vamos começar". Se o campo foi
  // deixado em branco, não força nada — só avança (mesmo comportamento de
  // antes desta funcionalidade existir). Só INTERPRETA (nunca aplica nada
  // ainda); uma falha aqui nunca trava o onboarding: segue em frente com os
  // módulos como já estavam.
  async function interpretarDescricao() {
    if (modoRevisao || !descricaoNegocio.trim()) {
      avancar();
      return;
    }
    setErroPerfil(null);
    setFaseInicial("interpretando");
    try {
      const rascunho = await empresaApi.interpretarPerfilOperacional(descricaoNegocio.trim());
      setPerfilRascunho(rascunho);
      setFaseInicial("confirmacao");
    } catch (e) {
      setErroPerfil(e instanceof ApiError ? e.message : "Não foi possível entender a descrição agora.");
      setFaseInicial("pergunta");
    }
  }

  // Passo 2 — chamado ao clicar "Continuar" na tela de confirmação. Só
  // agora os módulos são de fato aplicados; uma falha aqui também nunca
  // trava o onboarding, só mantém os módulos como já estavam antes.
  async function confirmarEAplicarPerfil() {
    if (!perfilRascunho) {
      avancar();
      return;
    }
    setErroPerfil(null);
    setFaseInicial("aplicando");
    try {
      await empresaApi.confirmarPerfilOperacional(perfilRascunho);
      avancar();
    } catch (e) {
      setErroPerfil(e instanceof ApiError ? e.message : "Não foi possível aplicar a configuração agora.");
      setFaseInicial("confirmacao");
    }
  }

  function voltar() {
    setIndice((atual) => Math.max(atual - 1, 0));
  }

  function irPara(caminho: string) {
    if (indice >= 1 && indice <= 5) concluirPasso(indice);
    aoFechar();
    navigate(caminho);
  }

  function pausarTour() {
    // Fecha sem marcar como concluído — o progresso já salvo (se houver)
    // continua disponível para retomar depois, pelo aviso no Início.
    aoFechar();
  }

  function pularTourCompleto() {
    aoFechar();
    if (modoRevisao) return;
    empresaApi
      .atualizar({ onboardingConcluido: true })
      .then(atualizarEmpresa)
      .catch(() => {});
  }

  function concluirTour() {
    aoFechar();
    if (modoRevisao) return;
    empresaApi
      .atualizar({ onboardingPasso: 5, onboardingConcluido: true })
      .then(atualizarEmpresa)
      .catch(() => {});
  }

  function aoClicarFechar() {
    if (indice === 0) pularTourCompleto();
    else pausarTour();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 motion-safe:animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl motion-safe:animate-fade-in-up sm:p-8">
        <button
          type="button"
          onClick={aoClicarFechar}
          aria-label="Continuar mais tarde"
          title="Continuar mais tarde"
          className="absolute right-4 top-4 rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
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

        {aguardandoConfirmacao && <TelaConfirmacao indice={indice} aoContinuar={confirmarChegada} />}

        {!aguardandoConfirmacao && indice === 0 && (
          <div className="text-center">
            <LogoSimbolo className="mx-auto h-10 w-14 text-ink-900" />
            <h2 className="mt-3 text-xl font-bold text-ink-900">Vamos deixar seu MOVA pronto?</h2>
            <p className="mt-2 text-sm text-ink-600">
              São 5 passos rápidos. Você pode sair a qualquer momento — a gente guarda seu
              progresso e você continua de onde parou.
            </p>

            {!modoRevisao && faseInicial !== "confirmacao" && faseInicial !== "aplicando" && (
              <div className="mt-5 text-left">
                <p className="text-sm font-medium text-ink-700">Uma coisa rápida antes de começar:</p>
                <p className="mt-1 text-sm text-ink-500">Conte para o MOVA o que sua empresa faz e o que ela vende ou oferece.</p>
                <div className="mt-3">
                  <Textarea
                    rotulo="O que sua empresa faz e vende ou oferece"
                    value={descricaoNegocio}
                    onChange={(e) => setDescricaoNegocio(e.target.value)}
                    placeholder='Ex: "Vendo ferramentas e máquinas para construção" ou "Faço limpeza de sofás, colchões e tapetes"'
                    disabled={faseInicial === "interpretando"}
                  />
                </div>
                {erroPerfil && (
                  <div className="mt-2">
                    <Alert tipo="erro">{erroPerfil}</Alert>
                  </div>
                )}
              </div>
            )}

            {(faseInicial === "confirmacao" || faseInicial === "aplicando") && perfilRascunho && (
              <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50 p-4 text-left">
                <p className="text-sm text-brand-900">
                  Entendi! Vou configurar o MOVA para {perfilRascunho.resumo}. Você pode alterar isso quando quiser em
                  Configurações → Recursos do MOVA.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col items-center gap-3">
              {faseInicial === "confirmacao" || faseInicial === "aplicando" ? (
                <Button onClick={confirmarEAplicarPerfil} carregando={faseInicial === "aplicando"} className="w-full sm:w-auto">
                  Continuar
                </Button>
              ) : (
                <Button onClick={interpretarDescricao} carregando={faseInicial === "interpretando"} className="w-full sm:w-auto">
                  Vamos começar
                </Button>
              )}
              <button type="button" onClick={pularTourCompleto} className="text-sm font-medium text-ink-500 hover:text-ink-700">
                Pular por enquanto
              </button>
            </div>
          </div>
        )}

        {!aguardandoConfirmacao && indice === 1 && (
          <div>
            <h2 className="text-lg font-bold text-ink-900">1. Primeiro, vamos conhecer sua empresa.</h2>
            <p className="mt-2 text-sm text-ink-600">
              Essas informações aparecem no orçamento que seu cliente recebe: nome, contato, logo e
              cores.
            </p>

            <div className="mt-4 flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-50 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#141818] text-sm font-semibold text-white">
                E
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-900">Sua empresa</p>
                <p className="text-xs text-ink-500">(11) 91234-5678 · contato@suaempresa.com</p>
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

        {!aguardandoConfirmacao && indice === 2 && (
          <div>
            <h2 className="text-lg font-bold text-ink-900">2. Agora vamos cadastrar o que sua empresa vende.</h2>
            <p className="mt-2 text-sm text-ink-600">Pode ser um produto ou um serviço.</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {EXEMPLOS_PRODUTO.map((exemplo) => (
                <span key={exemplo} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                  {exemplo}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-400">
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

        {!aguardandoConfirmacao && indice === 3 && (
          <div>
            <h2 className="text-lg font-bold text-ink-900">3. Diga o que você precisa saber do cliente.</h2>
            <p className="mt-2 text-sm text-ink-600">
              Cada serviço pode precisar de informações diferentes. Você escolhe o que precisa saber
              para conseguir fazer seu orçamento.
            </p>

            <div className="mt-4 rounded-xl border border-ink-200 p-4">
              <p className="text-sm font-medium text-ink-900">Exemplo: Portão</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {["Largura", "Altura", "Tipo de ferro", "Acabamento"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-ink-600">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-brand-600" fill="none" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-3 text-sm font-medium text-ink-800">
              Você decide o que perguntar. O MOVA organiza para você.
            </p>

            <div className="mt-5">
              <Button onClick={() => irPara("/produtos?novo=1")} className="w-full sm:w-auto">
                Ver como funciona
              </Button>
            </div>

            <Controles aoVoltar={voltar} aoPular={avancar} aoContinuar={avancar} />
          </div>
        )}

        {!aguardandoConfirmacao && indice === 4 && (
          <div>
            <h2 className="text-lg font-bold text-ink-900">4. Agora vamos criar seu primeiro orçamento.</h2>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-xs font-medium text-ink-600 sm:gap-2 sm:text-sm">
              {["Cliente", "Produto/serviço", "Informações", "Valor", "Revisar"].map((etapa, i, lista) => (
                <span key={etapa} className="flex items-center gap-1.5 sm:gap-2">
                  <span className="rounded-full bg-ink-100 px-2.5 py-1">{etapa}</span>
                  {i < lista.length - 1 && <span className="text-ink-300">→</span>}
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

        {!aguardandoConfirmacao && indice === 5 && (
          <div>
            <h2 className="text-lg font-bold text-ink-900">5. Seu orçamento está pronto!</h2>
            <p className="mt-2 text-sm text-ink-600">
              Agora você pode enviar para seu cliente pelo WhatsApp.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#25D366]/10 p-4 text-sm text-ink-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[#25D366]" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 004.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2z" />
              </svg>
              Compartilhar pelo WhatsApp também marca o orçamento como enviado, automaticamente.
            </div>

            <Controles aoVoltar={voltar} aoPular={avancar} aoContinuar={avancar} mostrarPular={false} />
          </div>
        )}

        {!aguardandoConfirmacao && indice === 6 && (
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-100 text-success-700">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <h2 className="mt-3 text-xl font-bold text-ink-900">Tudo pronto!</h2>
            <p className="mt-2 text-sm text-ink-600">
              Seu MOVA já está preparado para criar e enviar seus orçamentos.
            </p>
            <div className="mt-6">
              <Button onClick={concluirTour} className="w-full sm:w-auto">
                Começar a usar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
