import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert } from "../components/ui/Alert";
import { Skeleton } from "../components/ui/Skeleton";
import { StatusBadge } from "../components/ui/StatusBadge";
import { DocumentoOrcamento } from "../components/orcamentos/DocumentoOrcamento";
import { Logo } from "../components/Logo";
import { ApiError, orcamentosApi } from "../lib/api";
import type { OrcamentoPublico } from "../lib/api";

export function PublicOrcamentoPage() {
  const { id } = useParams<{ id: string }>();
  const [orcamento, setOrcamento] = useState<OrcamentoPublico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setCarregando(true);
    orcamentosApi
      .obterPublico(id)
      .then(setOrcamento)
      .catch((erroCapturado) =>
        setErro(
          erroCapturado instanceof ApiError
            ? erroCapturado.message
            : "Não foi possível carregar o orçamento."
        )
      )
      .finally(() => setCarregando(false));
  }, [id]);

  return (
    <div className="tema-claro-forcado min-h-svh bg-ink-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        {carregando && <Skeleton className="h-64" />}

        {!carregando && (erro || !orcamento) && <Alert tipo="erro">{erro ?? "Orçamento não encontrado."}</Alert>}

        {!carregando && orcamento && (
          <DocumentoOrcamento
            nomeEmpresa={orcamento.empresa.nome}
            logoUrl={orcamento.empresa.logoUrl}
            corPrimaria={orcamento.empresa.corPrimaria}
            numero={orcamento.numero}
            data={orcamento.data}
            validade={orcamento.validade}
            nomeCliente={orcamento.cliente.nome}
            itens={orcamento.itens}
            subtotal={orcamento.subtotal}
            desconto={orcamento.desconto}
            total={orcamento.total}
            observacoes={orcamento.observacoes}
            statusBadge={<StatusBadge status={orcamento.status} />}
          />
        )}

        <p className="mt-6 text-center text-xs text-ink-400">Gerado com MOVA</p>
      </div>
    </div>
  );
}
