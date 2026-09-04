import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import type { TipoCampo } from "../../lib/api";

export interface OpcaoRascunho {
  chave: string;
  rotulo: string;
}

export interface CampoRascunho {
  chave: string;
  nome: string;
  tipo: TipoCampo;
  unidade: string;
  obrigatorio: boolean;
  opcoes: OpcaoRascunho[];
}

const OPCOES_RESPOSTA: { valor: TipoCampo; rotulo: string; descricao: string }[] = [
  { valor: "TEXTO", rotulo: "Escrever uma resposta", descricao: "O cliente digita um texto livre." },
  { valor: "NUMERO", rotulo: "Informar um número", descricao: "Ex.: medidas, quantidade, peso." },
  { valor: "SELECAO_UNICA", rotulo: "Escolher uma opção", descricao: "O cliente escolhe uma entre várias." },
  {
    valor: "SELECAO_MULTIPLA",
    rotulo: "Escolher várias opções",
    descricao: "O cliente pode marcar mais de uma.",
  },
];

const UNIDADES_PRESET = ["metros", "cm", "m²", "kg", "litros", "unidades", "horas"];

function gerarChave() {
  return crypto.randomUUID();
}

export function campoRascunhoVazio(): CampoRascunho {
  return { chave: gerarChave(), nome: "", tipo: "TEXTO", unidade: "", obrigatorio: false, opcoes: [] };
}

function PreviaCampo({ campo }: { campo: CampoRascunho }) {
  const nome = campo.nome.trim() || "Esta informação";

  return (
    <div className="rounded-lg bg-ink-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
        Assim seu cliente verá
      </p>
      <div className="mt-2">
        <p className="text-sm font-medium text-ink-700">{nome}</p>

        {campo.tipo === "TEXTO" && (
          <input
            disabled
            placeholder="Resposta do cliente"
            className="mt-1.5 w-full rounded-lg border border-ink-200 bg-surface px-3 py-2 text-sm text-ink-400"
          />
        )}

        {campo.tipo === "NUMERO" && (
          <div className="mt-1.5 flex items-center gap-2">
            <input
              disabled
              placeholder="0"
              className="w-24 rounded-lg border border-ink-200 bg-surface px-3 py-2 text-sm text-ink-400"
            />
            {campo.unidade && <span className="text-sm text-ink-500">{campo.unidade}</span>}
          </div>
        )}

        {campo.tipo === "SELECAO_UNICA" && (
          <select
            disabled
            className="mt-1.5 w-full rounded-lg border border-ink-200 bg-surface px-3 py-2 text-sm text-ink-400"
          >
            <option>
              {campo.opcoes.length > 0 ? "Selecione uma opção..." : "(cadastre as opções abaixo)"}
            </option>
          </select>
        )}

        {campo.tipo === "SELECAO_MULTIPLA" && (
          <div className="mt-1.5 flex flex-col gap-1.5">
            {campo.opcoes.length === 0 && (
              <p className="text-sm text-ink-400">(cadastre as opções abaixo)</p>
            )}
            {campo.opcoes.map((opcao) => (
              <label key={opcao.chave} className="flex items-center gap-2 text-sm text-ink-500">
                <input disabled type="checkbox" className="h-4 w-4 rounded border-ink-300" />
                {opcao.rotulo || "..."}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface CamposBuilderProps {
  campos: CampoRascunho[];
  aoAlterar: (campos: CampoRascunho[]) => void;
}

export function CamposBuilder({ campos, aoAlterar }: CamposBuilderProps) {
  function atualizarCampo(chave: string, alteracoes: Partial<CampoRascunho>) {
    aoAlterar(campos.map((campo) => (campo.chave === chave ? { ...campo, ...alteracoes } : campo)));
  }

  function removerCampo(chave: string) {
    aoAlterar(campos.filter((campo) => campo.chave !== chave));
  }

  function adicionarCampo() {
    aoAlterar([...campos, campoRascunhoVazio()]);
  }

  function adicionarOpcao(campoChave: string) {
    const campo = campos.find((c) => c.chave === campoChave);
    if (!campo) return;
    atualizarCampo(campoChave, { opcoes: [...campo.opcoes, { chave: gerarChave(), rotulo: "" }] });
  }

  function atualizarOpcao(campoChave: string, opcaoChave: string, rotulo: string) {
    const campo = campos.find((c) => c.chave === campoChave);
    if (!campo) return;
    atualizarCampo(campoChave, {
      opcoes: campo.opcoes.map((opcao) => (opcao.chave === opcaoChave ? { ...opcao, rotulo } : opcao)),
    });
  }

  function removerOpcao(campoChave: string, opcaoChave: string) {
    const campo = campos.find((c) => c.chave === campoChave);
    if (!campo) return;
    atualizarCampo(campoChave, { opcoes: campo.opcoes.filter((opcao) => opcao.chave !== opcaoChave) });
  }

  return (
    <div className="flex flex-col gap-5">
      {campos.length === 0 && (
        <p className="text-sm text-ink-500">
          <strong className="text-ink-700">Exemplo:</strong> uma serralheria pode adicionar Largura,
          Altura, Tipo de ferro e Acabamento. Você pode criar as informações que fizerem sentido para o
          seu negócio.
        </p>
      )}

      {campos.map((campo, indice) => {
        const exigeOpcoes = campo.tipo === "SELECAO_UNICA" || campo.tipo === "SELECAO_MULTIPLA";
        const unidadeEhPreset = UNIDADES_PRESET.includes(campo.unidade);
        const unidadeSelect = campo.unidade === "" ? "" : unidadeEhPreset ? campo.unidade : "OUTRO";

        return (
          <div key={campo.chave} className="rounded-xl border border-ink-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-ink-900">
                {campo.nome.trim() || `Nova informação ${indice + 1}`}
              </p>
              <button
                type="button"
                onClick={() => removerCampo(campo.chave)}
                aria-label={`Remover ${campo.nome || "esta informação"}`}
                className="shrink-0 text-sm font-medium text-ink-400 hover:text-danger-600"
              >
                Remover
              </button>
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium text-ink-700">Qual informação você precisa saber?</label>
              <input
                type="text"
                placeholder="Ex.: Largura, Tipo de ferro, Cor, Quantidade de pessoas..."
                value={campo.nome}
                onChange={(evento) => atualizarCampo(campo.chave, { nome: evento.target.value })}
                className="mt-1.5 w-full rounded-lg border border-ink-200 bg-surface px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-ink-700">Como o cliente vai informar isso?</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {OPCOES_RESPOSTA.map((opcaoTipo) => (
                  <label
                    key={opcaoTipo.valor}
                    className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 transition-colors ${
                      campo.tipo === opcaoTipo.valor
                        ? "border-brand-600 bg-brand-50"
                        : "border-ink-200 hover:border-ink-300"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-ink-900">
                      <input
                        type="radio"
                        name={`tipo-${campo.chave}`}
                        checked={campo.tipo === opcaoTipo.valor}
                        onChange={() => atualizarCampo(campo.chave, { tipo: opcaoTipo.valor })}
                        className="h-4 w-4 border-ink-300 text-brand-600 focus:ring-brand-500"
                      />
                      {opcaoTipo.rotulo}
                    </span>
                    <span className="pl-6 text-xs text-ink-500">{opcaoTipo.descricao}</span>
                  </label>
                ))}
              </div>
            </div>

            {campo.tipo === "NUMERO" && (
              <div className="mt-4">
                <Select
                  rotulo="Unidade (opcional)"
                  value={unidadeSelect}
                  onChange={(evento) => {
                    const valor = evento.target.value;
                    atualizarCampo(campo.chave, { unidade: valor === "OUTRO" ? "" : valor });
                  }}
                >
                  <option value="">Sem unidade</option>
                  {UNIDADES_PRESET.map((unidade) => (
                    <option key={unidade} value={unidade}>
                      {unidade}
                    </option>
                  ))}
                  <option value="OUTRO">Outra...</option>
                </Select>
                {unidadeSelect === "OUTRO" && (
                  <input
                    type="text"
                    placeholder="Ex.: caixas, sacos..."
                    value={campo.unidade}
                    onChange={(evento) => atualizarCampo(campo.chave, { unidade: evento.target.value })}
                    className="mt-2 w-full rounded-lg border border-ink-200 bg-surface px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                )}
              </div>
            )}

            {exigeOpcoes && (
              <div className="mt-4">
                <p className="text-sm font-medium text-ink-700">
                  Quais opções o cliente poderá escolher?
                </p>
                {campo.tipo === "SELECAO_MULTIPLA" && (
                  <p className="text-xs text-ink-500">O cliente poderá escolher mais de uma opção.</p>
                )}
                <div className="mt-2 flex flex-col gap-2">
                  {campo.opcoes.map((opcao) => (
                    <div key={opcao.chave} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Ex.: Ferro galvanizado"
                        value={opcao.rotulo}
                        onChange={(evento) => atualizarOpcao(campo.chave, opcao.chave, evento.target.value)}
                        className="flex-1 rounded-lg border border-ink-200 bg-surface px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => removerOpcao(campo.chave, opcao.chave)}
                        aria-label="Remover opção"
                        className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-danger-600"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => adicionarOpcao(campo.chave)}
                  className="mt-2 text-sm font-medium text-brand-600 hover:underline"
                >
                  + Adicionar opção
                </button>
              </div>
            )}

            <div className="mt-4">
              <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
                <input
                  type="checkbox"
                  checked={campo.obrigatorio}
                  onChange={(evento) => atualizarCampo(campo.chave, { obrigatorio: evento.target.checked })}
                  className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                Esta informação é obrigatória
              </label>
              <p className="mt-0.5 pl-6 text-xs text-ink-500">
                Se marcada, o orçamento não poderá ser criado sem essa informação.
              </p>
            </div>

            <div className="mt-4">
              <PreviaCampo campo={campo} />
            </div>
          </div>
        );
      })}

      <Button type="button" variante="secundario" onClick={adicionarCampo} className="self-start">
        + Adicionar informação
      </Button>
    </div>
  );
}
