import { useEffect, useState } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { Skeleton } from "../components/ui/Skeleton";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { PageHeader } from "../components/ui/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ApiError, planosApi, assinaturasApi } from "../lib/api";
import type { PlanoConfig, PlanoTipo, Assinatura } from "../lib/api";
import { cn } from "../lib/cn";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const NOMES_PLANO: Record<PlanoTipo, string> = {
  GRATUITO: "Gratuito",
  START: "MOVA Start",
  BUSINESS: "MOVA Business",
  PRO: "MOVA Pro",
};

const DESCRICOES_PLANO: Record<PlanoTipo, string> = {
  GRATUITO: "Para começar a organizar seu negócio de verdade, sem custo.",
  START: "Para pequenos negócios que estão começando a se organizar.",
  BUSINESS: "Para empresas que já vendem todos os dias.",
  PRO: "Para quem quer extrair o máximo do MOVA.",
};

function textoLimite(valor: number | null, unidade: string): string {
  return valor === null ? `${unidade} ilimitados` : `Até ${valor} ${unidade}`;
}

function ListaRecursos({ plano }: { plano: PlanoConfig }) {
  const itens = [
    textoLimite(plano.limiteClientes, "clientes"),
    textoLimite(plano.limiteProdutos, "produtos/serviços"),
    plano.limiteOrcamentos === null
      ? "Orçamentos ilimitados"
      : `${plano.limiteOrcamentos} orçamentos${plano.limiteOrcamentosMensal ? "/mês" : " no total"}`,
    textoLimite(plano.limiteUsuarios, "usuários"),
  ];
  if (plano.recursos.estoqueCompleto) itens.push("Estoque completo");
  if (plano.recursos.relatoriosAvancados) itens.push("Relatórios avançados");
  if (plano.recursos.automacoes) itens.push("Automações");
  if (plano.recursos.iaCompleta) itens.push("IA completa");
  else if (plano.recursos.iaLimitada) itens.push("IA (recursos limitados)");
  if (plano.recursos.mercadoLivre) itens.push("Integração com Mercado Livre");

  return (
    <ul className="mt-4 flex flex-col gap-2">
      {itens.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-ink-600">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-success-600" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function PlanosPage() {
  const { empresa, atualizarEmpresa } = useAuth();
  const { mostrarSucesso } = useToast();
  const [planos, setPlanos] = useState<PlanoConfig[]>([]);
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ciclo, setCiclo] = useState<"MENSAL" | "ANUAL">("MENSAL");
  const [assinandoPlano, setAssinandoPlano] = useState<PlanoTipo | null>(null);
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    Promise.all([planosApi.listar(), assinaturasApi.minha().catch(() => null)])
      .then(([listaPlanos, minhaAssinatura]) => {
        setPlanos(listaPlanos);
        setAssinatura(minhaAssinatura);
      })
      .catch((erroCapturado) =>
        setErro(erroCapturado instanceof ApiError ? erroCapturado.message : "Não foi possível carregar os planos.")
      )
      .finally(() => setCarregando(false));
  }, []);

  async function assinar(planoTipo: PlanoTipo) {
    if (planoTipo === "GRATUITO") return;
    setErro(null);
    setAssinandoPlano(planoTipo);
    try {
      const resultado = await assinaturasApi.criarCheckout(planoTipo, ciclo);
      window.location.href = resultado.initPoint;
    } catch (erroCapturado) {
      setErro(
        erroCapturado instanceof ApiError ? erroCapturado.message : "Não foi possível iniciar a assinatura. Tente novamente."
      );
      setAssinandoPlano(null);
    }
  }

  async function confirmarCancelamento() {
    setCancelando(true);
    try {
      await assinaturasApi.cancelar();
      setAssinatura((atual) => (atual ? { ...atual, status: "CANCELADA" } : atual));
      if (empresa) atualizarEmpresa({ ...empresa, planoTipo: "GRATUITO" });
      mostrarSucesso("Assinatura cancelada");
      setConfirmandoCancelamento(false);
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ApiError ? erroCapturado.message : "Não foi possível cancelar a assinatura.");
    } finally {
      setCancelando(false);
    }
  }

  const assinaturaAtiva = assinatura?.status === "ATIVA";

  return (
    <AppLayout>
      <PageHeader titulo="Planos" subtitulo="Escolha o plano certo para o momento do seu negócio." />

      {assinatura?.status === "PENDENTE" && (
        <div className="mt-4">
          <Alert tipo="aviso">
            Sua assinatura está aguardando confirmação de pagamento pelo Mercado Pago. Isso pode levar alguns minutos.
          </Alert>
        </div>
      )}
      {assinatura?.status === "RECUSADA" && (
        <div className="mt-4">
          <Alert tipo="erro">Seu último pagamento foi recusado. Tente assinar novamente ou use outro meio de pagamento.</Alert>
        </div>
      )}

      <div className="mt-5 inline-flex rounded-lg border border-ink-200 bg-surface p-1">
        <button
          type="button"
          onClick={() => setCiclo("MENSAL")}
          className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", ciclo === "MENSAL" ? "bg-brand-600 text-white" : "text-ink-600")}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => setCiclo("ANUAL")}
          className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", ciclo === "ANUAL" ? "bg-brand-600 text-white" : "text-ink-600")}
        >
          Anual — economize 2 meses
        </button>
      </div>

      {erro && (
        <div className="mt-6">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {carregando && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((chave) => (
            <Skeleton key={chave} className="h-80" />
          ))}
        </div>
      )}

      {!carregando && planos.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {planos.map((plano) => {
            const atual = empresa?.planoTipo === plano.planoTipo;
            const destaque = plano.planoTipo === "BUSINESS";
            const preco = ciclo === "MENSAL" ? plano.precoMensal : plano.precoAnual;

            return (
              <Card key={plano.planoTipo} className={cn("relative flex flex-col", destaque && "border-brand-600 shadow-lg")}>
                {destaque && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                    Mais popular
                  </span>
                )}
                {atual && (
                  <span className="mb-2 inline-flex w-fit rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-700">
                    Seu plano atual
                  </span>
                )}
                <h2 className="text-lg font-semibold text-ink-900">{NOMES_PLANO[plano.planoTipo]}</h2>
                <p className="mt-1 text-sm text-ink-500">{DESCRICOES_PLANO[plano.planoTipo]}</p>

                <p className="mt-4">
                  <span className="text-3xl font-bold text-ink-900">
                    {Number(preco) === 0 ? "Grátis" : formatoMoeda.format(Number(preco))}
                  </span>
                  {Number(preco) > 0 && <span className="text-sm text-ink-500">{ciclo === "MENSAL" ? "/mês" : "/ano"}</span>}
                </p>
                {ciclo === "ANUAL" && Number(plano.precoAnual) > 0 && (
                  <p className="mt-0.5 text-xs text-success-700">Economize o equivalente a 2 meses no plano anual.</p>
                )}

                <ListaRecursos plano={plano} />

                <div className="mt-6">
                  {plano.planoTipo === "GRATUITO" ? (
                    <Button variante="secundario" className="w-full" disabled>
                      Plano de entrada
                    </Button>
                  ) : atual && assinaturaAtiva ? (
                    <Button variante="secundario" className="w-full" onClick={() => setConfirmandoCancelamento(true)}>
                      Cancelar assinatura
                    </Button>
                  ) : (
                    <Button
                      variante={destaque ? "primario" : "secundario"}
                      className="w-full"
                      carregando={assinandoPlano === plano.planoTipo}
                      disabled={assinandoPlano !== null}
                      onClick={() => assinar(plano.planoTipo)}
                    >
                      {atual ? "Reativar assinatura" : "Assinar agora"}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-center text-sm text-ink-500">
        Você será redirecionado ao Mercado Pago para concluir o pagamento com segurança.
      </p>

      <ConfirmDialog
        titulo="Cancelar assinatura"
        mensagem="Tem certeza que deseja cancelar sua assinatura? Seu plano volta imediatamente para o Gratuito. Seus dados não são apagados — só ficam indisponíveis novos cadastros que ultrapassem os limites do plano Gratuito."
        aberto={confirmandoCancelamento}
        confirmando={cancelando}
        rotuloConfirmar="Cancelar assinatura"
        varianteConfirmar="perigo"
        aoConfirmar={confirmarCancelamento}
        aoCancelar={() => setConfirmandoCancelamento(false)}
      />
    </AppLayout>
  );
}
