import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

interface ServicoExemplo {
  rotulo: string;
  precoBase: number;
  unidade: string;
}

const servicos: ServicoExemplo[] = [
  { rotulo: "Pintura residencial", precoBase: 35, unidade: "m²" },
  { rotulo: "Instalação elétrica", precoBase: 120, unidade: "ponto" },
  { rotulo: "Limpeza pós-obra", precoBase: 8, unidade: "m²" },
  { rotulo: "Manutenção geral", precoBase: 90, unidade: "hora" },
];

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function OrcamentoSimulador() {
  const [servicoIndice, setServicoIndice] = useState(0);
  const [quantidade, setQuantidade] = useState("10");

  const servico = servicos[servicoIndice];
  const valorEstimado = servico.precoBase * (Number(quantidade) || 0);

  return (
    <Card className="w-full max-w-sm p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-facil-100 text-facil-700">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 7h6m-6 4h6m-6 4h4M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"
            />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">Simule um orçamento</p>
          <p className="text-xs text-slate-500">Veja como o cálculo funciona</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="simulador-servico">
            Tipo de serviço
          </label>
          <select
            id="simulador-servico"
            value={servicoIndice}
            onChange={(evento) => setServicoIndice(Number(evento.target.value))}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-facil-500 focus:border-facil-500"
          >
            {servicos.map((item, indice) => (
              <option key={item.rotulo} value={indice}>
                {item.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="simulador-quantidade">
            Quantidade ({servico.unidade})
          </label>
          <input
            id="simulador-quantidade"
            type="number"
            min="0"
            step="1"
            value={quantidade}
            onChange={(evento) => setQuantidade(evento.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-facil-500 focus:border-facil-500"
          />
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Valor estimado</p>
          <p className="text-2xl font-bold text-slate-900">{formatoMoeda.format(valorEstimado)}</p>
        </div>

        <Link to="/registrar">
          <Button className="w-full">Criar meu orçamento agora</Button>
        </Link>

        <p className="text-center text-xs text-slate-400">
          Simulação ilustrativa. No OrçaFácil, cada empresa cadastra seus próprios serviços e preços.
        </p>
      </div>
    </Card>
  );
}
