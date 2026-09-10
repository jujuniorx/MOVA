import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function AceitarConvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const { aceitarConvite } = useAuth();

  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!token) {
    return (
      <AuthLayout>
        <Card>
          <h1 className="mb-3 text-lg font-semibold text-ink-900">Convite inválido</h1>
          <p className="text-sm text-ink-600">
            Este link de convite está incompleto. Peça ao dono da empresa para enviar um novo convite.
          </p>
          <Link to="/login" className="mt-6 block text-center text-sm font-medium text-brand-600 hover:underline">
            Ir para o login
          </Link>
        </Card>
      </AuthLayout>
    );
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (senha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }

    setEnviando(true);
    try {
      await aceitarConvite(token, nome, senha);
      navigate("/painel", { replace: true });
    } catch (erro) {
      setErro(erro instanceof ApiError ? erro.message : "Não foi possível concluir o convite agora. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      <Card>
        <h1 className="mb-2 text-lg font-semibold text-ink-900">Você foi convidado para o MOVA</h1>
        <p className="mb-6 text-sm text-ink-600">Crie sua senha para entrar na equipe.</p>

        <form className="flex flex-col gap-4" onSubmit={aoEnviar} noValidate>
          {erro && <Alert tipo="erro">{erro}</Alert>}

          <Input rotulo="Seu nome" value={nome} onChange={(evento) => setNome(evento.target.value)} required />

          <Input
            rotulo="Crie uma senha"
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            required
          />

          <Input
            rotulo="Confirme a senha"
            type="password"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(evento) => setConfirmacao(evento.target.value)}
            required
          />

          <Button type="submit" carregando={enviando} className="mt-2 w-full">
            Entrar na equipe
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}
