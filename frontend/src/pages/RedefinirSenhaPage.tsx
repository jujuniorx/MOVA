import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { ApiError, authApi } from "../lib/api";
import { redefinirSenhaSchema } from "../schemas/auth.schema";

export function RedefinirSenhaPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  if (!token) {
    return (
      <AuthLayout>
        <Card>
          <h1 className="mb-3 text-lg font-semibold text-ink-900">Link inválido</h1>
          <p className="text-sm text-ink-600">
            Este link de recuperação está incompleto. Solicite um novo link para redefinir sua senha.
          </p>
          <Link
            to="/esqueci-senha"
            className="mt-6 block text-center text-sm font-medium text-brand-600 hover:underline"
          >
            Solicitar novo link
          </Link>
        </Card>
      </AuthLayout>
    );
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (novaSenha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }

    const resultado = redefinirSenhaSchema.safeParse({ novaSenha });
    if (!resultado.success) {
      setErro(resultado.error.issues[0].message);
      return;
    }

    setEnviando(true);
    try {
      await authApi.redefinirSenha(token, resultado.data.novaSenha);
      setConcluido(true);
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (erro) {
      setErro(
        erro instanceof ApiError
          ? erro.message
          : "Não foi possível redefinir sua senha agora. Tente novamente."
      );
    } finally {
      setEnviando(false);
    }
  }

  if (concluido) {
    return (
      <AuthLayout>
        <Card>
          <h1 className="mb-3 text-lg font-semibold text-ink-900">Senha alterada</h1>
          <p className="text-sm text-ink-600">Sua senha foi alterada com sucesso. Levando você para o login...</p>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card>
        <h1 className="mb-2 text-lg font-semibold text-ink-900">Criar nova senha</h1>
        <p className="mb-6 text-sm text-ink-600">Escolha uma nova senha para entrar no MOVA.</p>

        <form className="flex flex-col gap-4" onSubmit={aoEnviar} noValidate>
          {erro && <Alert tipo="erro">{erro}</Alert>}

          <Input
            rotulo="Nova senha"
            type="password"
            autoComplete="new-password"
            value={novaSenha}
            onChange={(evento) => setNovaSenha(evento.target.value)}
            required
          />

          <Input
            rotulo="Confirme a nova senha"
            type="password"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(evento) => setConfirmacao(evento.target.value)}
            required
          />

          <Button type="submit" carregando={enviando} className="mt-2 w-full">
            Salvar nova senha
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}
