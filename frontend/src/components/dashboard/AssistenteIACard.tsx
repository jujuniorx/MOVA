import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader } from "../ui/Card";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { ApiError, iaApi } from "../../lib/api";
import type { CapacidadeIA } from "../../lib/api";

// Só as capacidades de "pergunta e resposta em texto" aparecem aqui — as
// capacidades de catálogo (sugestão por segmento / estruturação de texto)
// têm sua própria experiência dedicada em Produtos ("Cadastrar com IA").
const ROTULOS: Partial<Record<CapacidadeIA, string>> = {
  produtos_mais_vendidos: "Quais produtos mais vendem?",
  produtos_estoque_baixo: "O que está com estoque baixo?",
  comparativo_vendas_3_meses: "Como estão as vendas dos últimos 3 meses?",
  clientes_top: "Quem são meus melhores clientes?",
  rascunhar_mensagem_cliente: "Rascunhar uma mensagem para um cliente",
  rascunhar_orcamento: "Rascunhar a descrição de um item de orçamento",
};

export function AssistenteIACard() {
  const [capacidades, setCapacidades] = useState<CapacidadeIA[]>([]);
  const [configurado, setConfigurado] = useState(true);
  const [selecionada, setSelecionada] = useState<CapacidadeIA | "">("");
  const [resposta, setResposta] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [limiteAtingido, setLimiteAtingido] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    iaApi
      .capacidades()
      .then((r) => {
        setCapacidades(r.capacidades.filter((c) => c in ROTULOS));
        setConfigurado(r.configurado);
      })
      .catch(() => setCapacidades([]));
  }, []);

  async function perguntar() {
    if (!selecionada) return;
    setErro(null);
    setLimiteAtingido(false);
    setResposta(null);
    setCarregando(true);
    try {
      const r = await iaApi.perguntar(selecionada);
      setResposta(r.resposta);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível obter uma resposta agora.");
      setLimiteAtingido(e instanceof ApiError && e.codigo === "IA_LIMITE_MENSAL");
    } finally {
      setCarregando(false);
    }
  }

  if (capacidades.length === 0) {
    return (
      <Card>
        <CardHeader titulo="Assistente MOVA (IA)" descricao="Recurso disponível nos planos Business e Pro." />
        <div className="mt-3">
          <Link to="/planos" className="text-sm font-medium text-brand-600 hover:underline">
            Ver planos
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader titulo="Assistente MOVA (IA)" descricao="Peça um resumo rápido sobre o seu negócio." />
      <div className="mt-4 flex flex-col gap-3">
        {!configurado && <Alert tipo="aviso">A IA ainda não está configurada neste ambiente.</Alert>}
        {erro && !limiteAtingido && <Alert tipo="erro">{erro}</Alert>}
        {limiteAtingido && (
          <Alert tipo="aviso">
            Você já experimentou o poder da IA do MOVA — seu plano atual atingiu o limite deste recurso este mês.{" "}
            <Link to="/planos" className="font-semibold underline">
              Desbloquear mais com o Business ou Pro
            </Link>
          </Alert>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Select className="flex-1" value={selecionada} onChange={(e) => setSelecionada(e.target.value as CapacidadeIA)}>
            <option value="">Selecione uma pergunta...</option>
            {capacidades.map((c) => (
              <option key={c} value={c}>
                {ROTULOS[c]}
              </option>
            ))}
          </Select>
          <Button onClick={perguntar} carregando={carregando} disabled={!selecionada}>
            Perguntar
          </Button>
        </div>

        {resposta && <div className="rounded-lg bg-brand-50 p-4 text-sm text-brand-900">{resposta}</div>}
      </div>
    </Card>
  );
}
