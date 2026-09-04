import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import { registrarSchema } from "../schemas/auth.schema";

type CamposFormulario = "nomeEmpresa" | "nomeUsuario" | "email" | "senha";

export function RegisterPage() {
  const { registrar } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codigoIndicacao = searchParams.get("ref")?.trim() || undefined;

  const [valores, setValores] = useState({ nomeEmpresa: "", nomeUsuario: "", email: "", senha: "" });
  const [erros, setErros] = useState<Partial<Record<CamposFormulario, string>>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function atualizarCampo(campo: CamposFormulario, valor: string) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErroGeral(null);

    const resultado = registrarSchema.safeParse(valores);
    if (!resultado.success) {
      const camposComErro: Partial<Record<CamposFormulario, string>> = {};
      for (const issue of resultado.error.issues) {
        const campo = issue.path[0] as CamposFormulario;
        camposComErro[campo] = issue.message;
      }
      setErros(camposComErro);
      return;
    }
    setErros({});

    setEnviando(true);
    try {
      await registrar(
        resultado.data.nomeEmpresa,
        resultado.data.nomeUsuario,
        resultado.data.email,
        resultado.data.senha,
        codigoIndicacao
      );
      navigate("/painel", { replace: true });
    } catch (erro) {
      setErroGeral(
        erro instanceof ApiError ? erro.message : "Não foi possível criar sua conta. Tente novamente."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      <Card>
        <h1 className="mb-6 text-lg font-semibold text-ink-900">Criar sua conta</h1>

        <form className="flex flex-col gap-4" onSubmit={aoEnviar} noValidate>
          {erroGeral && <Alert tipo="erro">{erroGeral}</Alert>}
          {codigoIndicacao && !erroGeral && (
            <Alert tipo="sucesso">Você foi convidado para o MOVA — ao começar a usar, ganha dias de bônus.</Alert>
          )}

          <Input
            rotulo="Nome da empresa"
            value={valores.nomeEmpresa}
            onChange={(evento) => atualizarCampo("nomeEmpresa", evento.target.value)}
            erro={erros.nomeEmpresa}
            required
          />

          <Input
            rotulo="Seu nome"
            value={valores.nomeUsuario}
            onChange={(evento) => atualizarCampo("nomeUsuario", evento.target.value)}
            erro={erros.nomeUsuario}
            required
          />

          <Input
            rotulo="E-mail"
            type="email"
            autoComplete="email"
            value={valores.email}
            onChange={(evento) => atualizarCampo("email", evento.target.value)}
            erro={erros.email}
            required
          />

          <Input
            rotulo="Senha"
            type="password"
            autoComplete="new-password"
            value={valores.senha}
            onChange={(evento) => atualizarCampo("senha", evento.target.value)}
            erro={erros.senha}
            required
          />

          <Button type="submit" carregando={enviando} className="mt-2 w-full">
            Criar conta
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-ink-600">
        Já tem conta?{" "}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
