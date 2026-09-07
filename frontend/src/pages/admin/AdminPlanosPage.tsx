import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Card, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { ApiError, adminApi } from "../../lib/api";
import type { PlanoConfig } from "../../lib/api";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function CardPlano({ plano, aoSalvar }: { plano: PlanoConfig; aoSalvar: (precoMensal: number, precoAnual: number) => Promise<void> }) {
  const [precoMensal, setPrecoMensal] = useState(String(plano.precoMensal));
  const [precoAnual, setPrecoAnual] = useState(String(plano.precoAnual));
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const alterado = Number(precoMensal) !== Number(plano.precoMensal) || Number(precoAnual) !== Number(plano.precoAnual);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setSucesso(false);
    try {
      await aoSalvar(Number(precoMensal), Number(precoAnual));
      setSucesso(true);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card>
      <CardHeader
        titulo={plano.planoTipo}
        descricao={`Hoje: ${formatoMoeda.format(Number(plano.precoMensal))}/mês · ${formatoMoeda.format(Number(plano.precoAnual))}/ano`}
      />
      <div className="mt-4 flex flex-col gap-3">
        {erro && <Alert tipo="erro">{erro}</Alert>}
        {sucesso && <Alert tipo="sucesso">Preço atualizado.</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Input rotulo="Preço mensal (R$)" type="number" step="0.01" value={precoMensal} onChange={(e) => setPrecoMensal(e.target.value)} />
          <Input rotulo="Preço anual (R$)" type="number" step="0.01" value={precoAnual} onChange={(e) => setPrecoAnual(e.target.value)} />
        </div>
        <ul className="text-xs text-ink-500">
          <li>Clientes: {plano.limiteClientes ?? "ilimitado"}</li>
          <li>Produtos: {plano.limiteProdutos ?? "ilimitado"}</li>
          <li>Orçamentos: {plano.limiteOrcamentos ?? "ilimitado"}{plano.limiteOrcamentosMensal ? "/mês" : " (total)"}</li>
          <li>Usuários: {plano.limiteUsuarios ?? "ilimitado"}</li>
        </ul>
        <div>
          <Button tamanho="sm" onClick={salvar} carregando={salvando} disabled={!alterado}>
            Salvar preço
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function AdminPlanosPage() {
  const [planos, setPlanos] = useState<PlanoConfig[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function carregar() {
    adminApi
      .listarPlanos()
      .then(setPlanos)
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar os planos."));
  }

  useEffect(carregar, []);

  async function salvarPreco(tipo: PlanoConfig["planoTipo"], precoMensal: number, precoAnual: number) {
    await adminApi.atualizarPlano(tipo, { precoMensal, precoAnual });
    carregar();
  }

  return (
    <AdminLayout>
      <PageHeader titulo="Planos" subtitulo="Preços e limites comerciais do MOVA — a mesma fonte usada na Landing e no checkout." />

      {erro && (
        <div className="mt-4">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      {!planos ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((k) => (
            <Skeleton key={k} className="h-48" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {planos.map((p) => (
            <CardPlano key={p.planoTipo} plano={p} aoSalvar={(m, a) => salvarPreco(p.planoTipo, m, a)} />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
