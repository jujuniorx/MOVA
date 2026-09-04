import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader } from "../ui/Card";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { ApiError, iaApi } from "../../lib/api";
import type { CapacidadeIA } from "../../lib/api";

const ROTULOS: Record<CapacidadeIA, string> = {
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
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    iaApi
      .capacidades()
      .then((r) => {
        setCapacidades(r.capacidades);
        setConfigurado(r.configurado);
      })
      .catch(() => setCapacidades([]));
  }, []);

  async function perguntar() {
    if (!selecionada) return;
    setErro(null);
    setResposta(null);
    setCarregando(true);
    try {
      const r = await iaApi.perguntar(selecionada);
      setResposta(r.resposta);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível obter uma resposta agora.");
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
        {erro && <Alert tipo="erro">{erro}</Alert>}

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
