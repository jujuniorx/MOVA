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

function IconeOlho() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S5.5 5.5 12 5.5 21.5 12 21.5 12 18.5 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconeOlhoRiscado() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.6 5.63A10.6 10.6 0 0 1 12 5.5c6.5 0 9.5 6.5 9.5 6.5a13.2 13.2 0 0 1-3.15 4.12M7.36 7.36C4.87 8.9 3.32 11.24 2.5 12c0 0 3 6.5 9.5 6.5a9.9 9.9 0 0 0 4.15-.9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
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
        <h1 className="text-xl font-bold tracking-tight text-ink-900">Entrar na sua conta</h1>
        <p className="mt-1.5 text-sm text-ink-500">Acesse o painel da sua empresa no MOVA.</p>

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
                type={senhaVisivel ? "text" : "password"}
                autoComplete="current-password"
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
                erro={erros.senha}
                required
                direita={
                  <button
                    type="button"
                    onClick={() => setSenhaVisivel((atual) => !atual)}
                    aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={senhaVisivel}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-ink-400 hover:text-ink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    {senhaVisivel ? <IconeOlhoRiscado /> : <IconeOlho />}
                  </button>
                }
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
