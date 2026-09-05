import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { ApiError, authApi } from "../lib/api";
import { esqueciSenhaSchema } from "../schemas/auth.schema";

export function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    const resultado = esqueciSenhaSchema.safeParse({ email });
    if (!resultado.success) {
      setErro(resultado.error.issues[0].message);
      return;
    }

    setEnviando(true);
    try {
      await authApi.esqueciSenha(resultado.data.email);
      // A resposta é sempre a mesma exista ou não a conta — o frontend
      // reflete isso mostrando a mesma tela de "verifique seu e-mail" nos
      // dois casos, nunca revelando se o e-mail está cadastrado.
      setEnviado(true);
    } catch (erro) {
      setErro(erro instanceof ApiError ? erro.message : "Não foi possível enviar o link agora. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <AuthLayout>
        <Card>
          <h1 className="mb-3 text-lg font-semibold text-ink-900">Verifique seu e-mail</h1>
          <p className="text-sm text-ink-600">
            Se <strong>{email}</strong> estiver cadastrado no MOVA, você vai receber um link para criar uma nova
            senha. O link é válido por 1 hora.
          </p>
          <Link to="/login" className="mt-6 block text-center text-sm font-medium text-brand-600 hover:underline">
            Voltar para o login
          </Link>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card>
        <h1 className="mb-2 text-lg font-semibold text-ink-900">Esqueceu sua senha?</h1>
        <p className="mb-6 text-sm text-ink-600">
          Informe o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.
        </p>

        <form className="flex flex-col gap-4" onSubmit={aoEnviar} noValidate>
          {erro && <Alert tipo="erro">{erro}</Alert>}

          <Input
            rotulo="E-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            required
          />

          <Button type="submit" carregando={enviando} className="mt-2 w-full">
            Enviar link de recuperação
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-ink-600">
        Lembrou a senha?{" "}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </AuthLayout>
  );
}
