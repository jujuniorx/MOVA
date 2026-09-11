import { useState } from "react";
import { Card, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { useAuth } from "../../context/AuthContext";
import { ApiError, empresaApi } from "../../lib/api";

/**
 * "Ensine ao MOVA como sua empresa trabalha" — essas respostas viram
 * contexto nos textos que a IA sugere (mensagens, follow-ups), nunca uma
 * instrução que a IA executa sozinha. Pertence só a esta empresa.
 */
export function MemoriaEmpresaCard() {
  const { empresa, atualizarEmpresa } = useAuth();
  const [tom, setTom] = useState(empresa?.memoriaIA?.tomComunicacao ?? "neutro");
  const [descontoMaximo, setDescontoMaximo] = useState(
    empresa?.memoriaIA?.descontoMaximoPercentual !== undefined ? String(empresa.memoriaIA.descontoMaximoPercentual) : ""
  );
  const [margemMinima, setMargemMinima] = useState(
    empresa?.memoriaIA?.margemMinimaPercentual !== undefined ? String(empresa.memoriaIA.margemMinimaPercentual) : ""
  );
  const [regrasLivres, setRegrasLivres] = useState(empresa?.memoriaIA?.regrasLivres ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function salvar() {
    setErro(null);
    setSucesso(false);
    setSalvando(true);
    try {
      const atualizada = await empresaApi.atualizar({
        memoriaIA: {
          tomComunicacao: tom as "formal" | "neutro" | "descontraido",
          descontoMaximoPercentual: descontoMaximo ? Number(descontoMaximo) : undefined,
          margemMinimaPercentual: margemMinima ? Number(margemMinima) : undefined,
          regrasLivres: regrasLivres || undefined,
        },
      });
      atualizarEmpresa(atualizada);
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
        titulo="Ensine ao MOVA como sua empresa trabalha"
        descricao="Essas preferências ajudam a IA a escrever mensagens e sugestões do jeito da sua empresa — nunca são usadas para decidir preço ou executar algo sozinha."
      />
      <div className="mt-4 flex flex-col gap-4">
        {erro && <Alert tipo="erro">{erro}</Alert>}
        {sucesso && <Alert tipo="sucesso">Alterações salvas.</Alert>}

        <Select
          rotulo="Tom de comunicação nas mensagens sugeridas"
          value={tom}
          onChange={(e) => setTom(e.target.value as "formal" | "neutro" | "descontraido")}
        >
          <option value="formal">Formal</option>
          <option value="neutro">Neutro (padrão)</option>
          <option value="descontraido">Descontraído</option>
        </Select>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            rotulo="Desconto máximo que você costuma dar (%)"
            type="number"
            min={0}
            max={100}
            value={descontoMaximo}
            onChange={(e) => setDescontoMaximo(e.target.value)}
            dica="Opcional — usado só como referência em sugestões, nunca aplicado automaticamente."
          />
          <Input
            rotulo="Margem mínima que você precisa manter (%)"
            type="number"
            min={0}
            max={100}
            value={margemMinima}
            onChange={(e) => setMargemMinima(e.target.value)}
            dica="Opcional."
          />
        </div>

        <Textarea
          rotulo="Outras regras ou preferências (texto livre)"
          placeholder="Ex.: nunca prometer prazo antes de confirmar com o cliente; sempre mencionar garantia de 90 dias."
          value={regrasLivres}
          onChange={(e) => setRegrasLivres(e.target.value)}
        />

        <div>
          <Button type="button" onClick={salvar} carregando={salvando}>
            Salvar preferências
          </Button>
        </div>
      </div>
    </Card>
  );
}
