/**
 * Aplica a máscara brasileira de telefone/WhatsApp enquanto o usuário digita:
 * (11) 91234-5678 ou (11) 1234-5678, dependendo da quantidade de dígitos.
 * Sempre remove qualquer caractere que não seja número antes de formatar —
 * não é possível digitar letra nesse campo.
 */
export function formatarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);

  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}
