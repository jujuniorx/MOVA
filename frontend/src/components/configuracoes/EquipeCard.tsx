import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Card, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { useAuth } from "../../context/AuthContext";
import { ApiError, usuariosApi } from "../../lib/api";
import type { ConviteUsuario, PapelUsuario, UsuarioEquipe } from "../../lib/api";

const ROTULO_PAPEL: Record<PapelUsuario, string> = { DONO: "Dono", FUNCIONARIO: "Funcionário" };

export function EquipeCard() {
  const { usuario } = useAuth();
  const souDono = usuario?.papel === "DONO";

  const [equipe, setEquipe] = useState<UsuarioEquipe[] | null>(null);
  const [convites, setConvites] = useState<ConviteUsuario[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [emailConvite, setEmailConvite] = useState("");
  const [papelConvite, setPapelConvite] = useState<PapelUsuario>("FUNCIONARIO");
  const [convidando, setConvidando] = useState(false);
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  function carregar() {
    usuariosApi.listar().then(setEquipe).catch(() => setEquipe([]));
    if (souDono) {
      usuariosApi.listarConvites().then(setConvites).catch(() => setConvites([]));
    }
  }

  useEffect(carregar, [souDono]);

  async function convidar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setConvidando(true);
    try {
      await usuariosApi.convidar(emailConvite.trim(), papelConvite);
      setEmailConvite("");
      setPapelConvite("FUNCIONARIO");
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível enviar o convite.");
    } finally {
      setConvidando(false);
    }
  }

  async function revogarConvite(id: string) {
    setProcessandoId(id);
    try {
      await usuariosApi.revogarConvite(id);
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível revogar o convite.");
    } finally {
      setProcessandoId(null);
    }
  }

  async function alternarAtivo(alvo: UsuarioEquipe) {
    setProcessandoId(alvo.id);
    setErro(null);
    try {
      await usuariosApi.atualizarAtivo(alvo.id, !alvo.ativo);
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível atualizar o usuário.");
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <Card>
      <CardHeader
        titulo="Equipe"
        descricao={
          souDono
            ? "Convide outras pessoas para usar o MOVA na sua empresa."
            : "Quem faz parte da sua empresa no MOVA. Só o dono pode convidar ou gerenciar a equipe."
        }
      />

      {erro && (
        <div className="mt-3">
          <Alert tipo="erro">{erro}</Alert>
        </div>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {equipe === null && <p className="text-sm text-ink-500">Carregando…</p>}
        {equipe?.map((membro) => (
          <li
            key={membro.id}
            className="flex flex-col gap-2 rounded-lg border border-ink-200 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-ink-900">{membro.nome}</p>
                <Badge className="bg-brand-50 text-brand-700">{ROTULO_PAPEL[membro.papel]}</Badge>
                {!membro.ativo && <Badge className="bg-ink-100 text-ink-600">Desativado</Badge>}
              </div>
              <p className="text-xs text-ink-500">{membro.email}</p>
            </div>
            {souDono && membro.id !== usuario?.id && (
              <Button
                tamanho="sm"
                variante="secundario"
                carregando={processandoId === membro.id}
                onClick={() => alternarAtivo(membro)}
              >
                {membro.ativo ? "Desativar" : "Reativar"}
              </Button>
            )}
          </li>
        ))}
      </ul>

      {souDono && (
        <>
          {convites.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Convites pendentes</p>
              <ul className="mt-2 flex flex-col gap-2">
                {convites.map((convite) => (
                  <li
                    key={convite.id}
                    className="flex flex-col gap-2 rounded-lg border border-ink-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm text-ink-900">{convite.email}</p>
                      <p className="text-xs text-ink-500">{ROTULO_PAPEL[convite.papel]}</p>
                    </div>
                    <Button
                      tamanho="sm"
                      variante="perigo"
                      carregando={processandoId === convite.id}
                      onClick={() => revogarConvite(convite.id)}
                    >
                      Revogar
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form className="mt-5 flex flex-col gap-3 border-t border-ink-100 pt-4 sm:flex-row sm:items-end" onSubmit={convidar}>
            <div className="flex-1">
              <Input
                rotulo="Convidar por e-mail"
                type="email"
                required
                value={emailConvite}
                onChange={(e) => setEmailConvite(e.target.value)}
                placeholder="pessoa@exemplo.com"
              />
            </div>
            <Select rotulo="Função" value={papelConvite} onChange={(e) => setPapelConvite(e.target.value as PapelUsuario)}>
              <option value="FUNCIONARIO">Funcionário</option>
              <option value="DONO">Dono</option>
            </Select>
            <Button type="submit" carregando={convidando} className="sm:w-fit">
              Enviar convite
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}
