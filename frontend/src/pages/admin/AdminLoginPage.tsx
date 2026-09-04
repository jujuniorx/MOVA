import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "../../components/Logo";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { ApiError } from "../../lib/api";

export function AdminLoginPage() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(email, senha);
      navigate("/admin", { replace: true });
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-ink-50 px-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Logo />
        <span className="rounded-full bg-[#141818] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
          Administração
        </span>
      </div>

      <Card className="w-full max-w-sm">
        <h1 className="text-lg font-semibold text-ink-900">Acesso administrativo</h1>
        <p className="mt-1 text-sm text-ink-500">Restrito à equipe do MOVA.</p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={aoEnviar} noValidate>
          {erro && <Alert tipo="erro">{erro}</Alert>}

          <Input
            rotulo="E-mail"
            type="email"
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            rotulo="Senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          <Button type="submit" carregando={enviando} className="mt-2 w-full">
            Entrar
          </Button>
        </form>
      </Card>
    </div>
  );
}
