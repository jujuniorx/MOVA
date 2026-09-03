/**
 * Campos da Empresa considerados seguros para devolver ao próprio usuário
 * autenticado dela (nunca inclui dados de outra empresa). Reutilizado em
 * /auth/* e /empresa para manter o mesmo formato em todo o app.
 */
export const empresaSelectPropria = {
  id: true,
  nome: true,
  telefone: true,
  whatsapp: true,
  email: true,
  endereco: true,
  descricao: true,
  logoUrl: true,
  corPrimaria: true,
  corSecundaria: true,
  onboardingConcluido: true,
} as const;
