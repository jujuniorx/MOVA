import { useEffect, useState } from "react";
import { Card, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { ApiError, empresaApi } from "../../lib/api";
import type { StatusOrcamento } from "../../lib/api";

interface EtapaRascunho {
  chave: string;
  nome: string;
  statusBase: StatusOrcamento;
  cor: string;
}

const MOMENTOS: { valor: StatusOrcamento; rotulo: string }[] = [
  { valor: "RASCUNHO", rotulo: "Antes de enviar (rascunho)" },
  { valor: "ENVIADO", rotulo: "Depois de enviado, aguardando o cliente" },
  { valor: "APROVADO", rotulo: "Depois de aprovado" },
  { valor: "RECUSADO", rotulo: "Depois de recusado" },
];

function gerarChave() {
  return crypto.randomUUID();
}

function etapaVazia(): EtapaRascunho {
  return { chave: gerarChave(), nome: "", statusBase: "RASCUNHO", cor: "" };
}

/**
 * "Como funciona o seu processo de orçamento?" — a empresa pode nomear
 * etapas próprias (ex.: "Lead", "Em negociação", "Aguardando pagamento")
 * mais detalhadas que os 4 status técnicos do orçamento. Isso NUNCA muda o
 * status real (que continua Rascunho/Enviado/Aprovado/Recusado) — é só um
 * rótulo a mais, organizado por qual desses 4 momentos ele representa.
 * Empresa que não configura nada continua vendo só o status padrão.
 */
export function ProcessoOrcamentoCard() {
  const [carregando, setCarregando] = useState(true);
  const [nomeProcesso, setNomeProcesso] = useState("Meu processo de orçamento");
  const [etapas, setEtapas] = useState<EtapaRascunho[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    empresaApi
      .obterProcesso("ORCAMENTO")
      .then((processo) => {
        if (!processo) return;
        setNomeProcesso(processo.nome);
        setEtapas(
          processo.etapas.map((etapa) => ({
            chave: etapa.id,
            nome: etapa.nome,
            statusBase: etapa.statusBase,
            cor: etapa.cor ?? "",
          }))
        );
      })
      .catch(() => setErro("Não foi possível carregar o processo configurado."))
      .finally(() => setCarregando(false));
  }, []);

  function atualizarEtapa(chave: string, alteracoes: Partial<EtapaRascunho>) {
    setEtapas((atual) => atual.map((etapa) => (etapa.chave === chave ? { ...etapa, ...alteracoes } : etapa)));
  }

  function removerEtapa(chave: string) {
    setEtapas((atual) => atual.filter((etapa) => etapa.chave !== chave));
  }

  async function salvar() {
    setErro(null);
    setSucesso(false);
    setSalvando(true);
    try {
      const etapasParaSalvar = etapas
        .filter((etapa) => etapa.nome.trim() !== "")
        .map((etapa) => ({
          nome: etapa.nome.trim(),
          statusBase: etapa.statusBase,
          cor: etapa.cor || undefined,
        }));
      const salvo = await empresaApi.atualizarProcesso("ORCAMENTO", {
        nome: nomeProcesso.trim() || "Meu processo de orçamento",
        etapas: etapasParaSalvar,
      });
      setEtapas(
        salvo.etapas.map((etapa) => ({
          chave: etapa.id,
          nome: etapa.nome,
          statusBase: etapa.statusBase,
          cor: etapa.cor ?? "",
        }))
      );
      setSucesso(true);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível salvar o processo.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return null;

  return (
    <Card>
      <CardHeader
        titulo="Como funciona seu processo de orçamento?"
        descricao='Além de Rascunho, Enviado, Aprovado e Recusado, você pode nomear etapas mais detalhadas (ex.: "Lead", "Em negociação", "Aguardando pagamento"). Opcional — se não configurar nada, o MOVA continua mostrando só o status padrão.'
      />
      <div className="mt-4 flex flex-col gap-5">
        {erro && <Alert tipo="erro">{erro}</Alert>}
        {sucesso && <Alert tipo="sucesso">Processo salvo.</Alert>}

        {etapas.length > 0 && (
          <Input
            rotulo="Nome do processo"
            value={nomeProcesso}
            onChange={(evento) => setNomeProcesso(evento.target.value)}
          />
        )}

        {etapas.length === 0 && (
          <p className="text-sm text-ink-500">
            <strong className="text-ink-700">Exemplo:</strong> uma serralheria pode usar Lead → Aguardando
            resposta → Em negociação → Fechado. Uma clínica pode usar Avaliação → Orçamento enviado →
            Confirmado. Crie as etapas que fizerem sentido para o seu negócio.
          </p>
        )}

        {etapas.map((etapa, indice) => (
          <div key={etapa.chave} className="rounded-xl border border-ink-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-ink-900">{etapa.nome.trim() || `Nova etapa ${indice + 1}`}</p>
              <button
                type="button"
                onClick={() => removerEtapa(etapa.chave)}
                aria-label={`Remover ${etapa.nome || "esta etapa"}`}
                className="shrink-0 text-sm font-medium text-ink-400 hover:text-danger-600"
              >
                Remover
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                rotulo="Nome da etapa"
                placeholder="Ex.: Em negociação"
                value={etapa.nome}
                onChange={(evento) => atualizarEtapa(etapa.chave, { nome: evento.target.value })}
              />
              <Select
                rotulo="Em qual momento ela acontece?"
                value={etapa.statusBase}
                onChange={(evento) => atualizarEtapa(etapa.chave, { statusBase: evento.target.value as StatusOrcamento })}
              >
                {MOMENTOS.map((momento) => (
                  <option key={momento.valor} value={momento.valor}>
                    {momento.rotulo}
                  </option>
                ))}
              </Select>
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium text-ink-700" htmlFor={`cor-etapa-${etapa.chave}`}>
                Cor (opcional)
              </label>
              <input
                id={`cor-etapa-${etapa.chave}`}
                type="color"
                value={etapa.cor || "#6b7280"}
                onChange={(evento) => atualizarEtapa(etapa.chave, { cor: evento.target.value })}
                className="mt-1.5 block h-9 w-14 rounded-lg border border-ink-200"
              />
            </div>
          </div>
        ))}

        <Button
          type="button"
          variante="secundario"
          onClick={() => setEtapas((atual) => [...atual, etapaVazia()])}
          className="self-start"
        >
          + Adicionar etapa
        </Button>

        <div>
          <Button type="button" onClick={salvar} carregando={salvando}>
            Salvar processo
          </Button>
        </div>
      </div>
    </Card>
  );
}
