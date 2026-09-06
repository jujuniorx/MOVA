import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import { loginSchema } from "../schemas/auth.schema";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErroGeral(null);

    const resultado = loginSchema.safeParse({ email, senha });
    if (!resultado.success) {
      const camposComErro: { email?: string; senha?: string } = {};
      for (const issue of resultado.error.issues) {
        const campo = issue.path[0] as "email" | "senha";
        camposComErro[campo] = issue.message;
      }
      setErros(camposComErro);
      return;
    }
    setErros({});

    setEnviando(true);
    try {
      await login(resultado.data.email, resultado.data.senha);
      navigate("/painel", { replace: true });
    } catch (erro) {
      setErroGeral(erro instanceof ApiError ? erro.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      <Card>
        <h1 className="text-lg font-semibold text-ink-900">Entrar na sua conta</h1>
        <p className="mt-1 text-sm text-ink-500">Acesse o painel da sua empresa no MOVA.</p>

        <form className="mt-6 flex flex-col gap-5" onSubmit={aoEnviar} noValidate>
          {erroGeral && <Alert tipo="erro">{erroGeral}</Alert>}

          <div className="flex flex-col gap-4">
            <Input
              rotulo="E-mail"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              erro={erros.email}
              required
            />

            <div className="flex flex-col gap-1.5">
              <Input
                rotulo="Senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
                erro={erros.senha}
                required
              />
              <Link to="/esqueci-senha" className="self-end text-sm font-medium text-brand-600 hover:underline">
                Esqueci minha senha
              </Link>
            </div>
          </div>

          <Button type="submit" carregando={enviando} className="w-full">
            Entrar
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-ink-600">
        Ainda não tem conta?{" "}
        <Link to="/registrar" className="font-medium text-brand-600 hover:underline">
          Criar minha conta
        </Link>
      </p>
    </AuthLayout>
  );
}
