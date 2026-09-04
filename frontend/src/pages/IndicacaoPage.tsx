import { useEffect, useState } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { Skeleton } from "../components/ui/Skeleton";
import { PageHeader } from "../components/ui/PageHeader";
import { useToast } from "../context/ToastContext";
import { ApiError, indicacaoApi } from "../lib/api";
import type { DadosIndicacao } from "../lib/api";

const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const PASSOS = [
  { numero: "1", titulo: "Convide", descricao: "Compartilhe seu link com outros empresários." },
  { numero: "2", titulo: "Ele cria a conta e usa", descricao: "Cadastra um cliente, um produto e cria o primeiro orçamento." },
  { numero: "3", titulo: "Vocês dois ganham", descricao: "A indicação é confirmada e os dias de bônus caem na conta automaticamente." },
];

export function IndicacaoPage() {
  const { mostrarSucesso } = useToast();
  const [dados, setDados] = useState<DadosIndicacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    indicacaoApi
      .minha()
      .then(setDados)
      .catch((erroCapturado) =>
        setErro(erroCapturado instanceof ApiError ? erroCapturado.message : "Não foi possível carregar seus dados de indicação.")
      )
      .finally(() => setCarregando(false));
  }, []);

  const linkIndicacao = dados ? `${window.location.origin}/registrar?ref=${dados.codigoIndicacao}` : "";

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(linkIndicacao);
      mostrarSucesso("✓ Link copiado");
    } catch {
      // navigator.clipboard pode falhar em contexto não seguro/permissão negada — sem tratamento especial, o usuário ainda vê o link na tela para copiar manualmente.
    }
  }

  return (
    <AppLayout>
      <PageHeader
        titulo="Indique o MOVA"
        subtitulo="Cada empresa que você trouxer e ativar te dá dias de acesso ao MOVA Start — e ela também ganha."
      />

      {erro && (
        <div className="mt-6">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {carregando && (
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-24" />
        </div>
      )}

      {!carregando && dados && (
        <div className="mt-6 flex flex-col gap-6">
          <Card>
            <CardHeader titulo="Seu link de indicação" descricao="Compartilhe pelo WhatsApp, e-mail ou onde fizer sentido." />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={linkIndicacao}
                onFocus={(evento) => evento.target.select()}
                className="min-h-11 w-full flex-1 rounded-lg border border-ink-200 bg-ink-50 px-3 text-sm text-ink-700"
              />
              <Button onClick={copiarLink} className="sm:w-auto">
                Copiar link
              </Button>
            </div>
            <p className="mt-2 text-xs text-ink-400">Código: {dados.codigoIndicacao}</p>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-ink-500">Indicações válidas</p>
              <p className="mt-1 text-2xl font-bold text-ink-900">{dados.indicacoesValidas}</p>
            </Card>
            <Card>
              <p className="text-sm text-ink-500">Aguardando ativação</p>
              <p className="mt-1 text-2xl font-bold text-ink-900">{dados.indicacoesPendentes}</p>
            </Card>
            <Card>
              <p className="text-sm text-ink-500">Dias garantidos pelo programa</p>
              <p className="mt-1 text-2xl font-bold text-ink-900">
                {dados.diasGarantidosPeloPrograma}/{dados.tetoDiasPrograma}
              </p>
            </Card>
          </div>

          {dados.tetoAtingido && (
            <Alert tipo="sucesso">
              Você já garantiu o máximo de {dados.tetoDiasPrograma} dias de bônus por indicação. Novas indicações continuam
              válidas, mas o programa não concede mais dias além desse teto.
            </Alert>
          )}

          {dados.trialBonusAteEm && new Date(dados.trialBonusAteEm) > new Date() && (
            <Alert tipo="sucesso">
              Seu acesso com os limites do MOVA Start está ativo até {formatoData.format(new Date(dados.trialBonusAteEm))}.
            </Alert>
          )}

          {dados.foiIndicadaPor === "PENDENTE" && (
            <Alert tipo="aviso">
              Você foi convidado para o MOVA! Cadastre um cliente, um produto e crie seu primeiro orçamento para liberar o
              bônus de boas-vindas.
            </Alert>
          )}

          <Card>
            <CardHeader titulo="Como funciona" />
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {PASSOS.map((passo) => (
                <div key={passo.numero} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#141818] text-sm font-semibold text-white">
                    {passo.numero}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{passo.titulo}</p>
                    <p className="mt-0.5 text-sm text-ink-500">{passo.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs text-ink-400">
              Progressão de bônus: 1ª indicação válida = 7 dias · 2ª = 14 dias no total · 3ª = 21 · 4ª = 28 · 5ª = 30 dias
              (teto do programa). A pessoa indicada também ganha 14 dias de acesso ao MOVA Start ao ativar a conta.
            </p>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
