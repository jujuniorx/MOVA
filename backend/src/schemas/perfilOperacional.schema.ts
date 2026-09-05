import { z } from "zod";

export const definirPerfilOperacionalSchema = z.object({
  descricaoNegocio: z.string().trim().min(3, "Conte um pouco sobre o que sua empresa faz.").max(1000),
  ofertaDescricao: z.string().trim().max(1000).optional(),
  // Quando o usuário decide não confiar na sugestão automática e escolhe os
  // módulos manualmente na própria tela de confirmação — nunca obrigatório.
  modulosEscolhidos: z.array(z.string().trim().max(50)).max(10).optional(),
});
