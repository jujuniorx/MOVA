import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import {
  interpretarPerfilTrabalhoSchema,
  confirmarPerfilTrabalhoSchema,
  atualizarCargoSchema,
} from "../schemas/perfilTrabalho.schema";
import {
  iaConfigurada,
  interpretarPerfilTrabalho,
  interpretarPerfilTrabalhoHeuristico,
  validarPerfilTrabalho,
} from "../lib/ia";

const router = Router();

router.use(autenticar);

// Sem parâmetro de ID em nenhuma rota abaixo: a pessoa afetada é sempre a do
// token (req.usuario.id), nunca outra vinda do corpo ou da URL — perfil de
// trabalho é por PESSOA, não por empresa, então isolar por empresaId não
// basta aqui (impediria só cross-tenant, não um usuário editando o perfil de
// um colega da mesma empresa).

router.get("/me/perfil-trabalho", async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { id: req.usuario!.id },
      select: { cargo: true, perfilTrabalho: true },
    });
    return res.json({ cargo: usuario.cargo, perfilTrabalho: usuario.perfilTrabalho ?? null });
  } catch (erro) {
    console.error("Erro ao buscar perfil de trabalho:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar seu perfil de trabalho." });
  }
});

router.patch("/me/cargo", async (req, res) => {
  const resultado = atualizarCargoSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  try {
    await prisma.usuario.update({ where: { id: req.usuario!.id }, data: { cargo: resultado.data.cargo } });
    return res.status(204).send();
  } catch (erro) {
    console.error("Erro ao atualizar cargo:", erro);
    return res.status(500).json({ erro: "Não foi possível salvar agora." });
  }
});

// Passo 1 (PESSOA DESCREVE → MOVA INTERPRETA): só interpreta (IA quando
// configurada, heurística por palavra-chave como fallback) e devolve o
// rascunho — nunca grava nada, mesmo padrão de segurança do Perfil
// Operacional da empresa (ver empresa.routes.ts).
router.post("/me/perfil-trabalho/interpretar", async (req, res) => {
  const resultado = interpretarPerfilTrabalhoSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  const { descricaoLivre } = resultado.data;

  try {
    let interpretado;
    let origem: "ia" | "heuristica";

    if (iaConfigurada()) {
      try {
        const resultadoIA = await interpretarPerfilTrabalho(descricaoLivre);
        interpretado = validarPerfilTrabalho(resultadoIA.texto);
        origem = "ia";
      } catch (erro) {
        console.error("Falha ao interpretar perfil de trabalho com IA, usando heurística:", erro);
        interpretado = interpretarPerfilTrabalhoHeuristico(descricaoLivre);
        origem = "heuristica";
      }
    } else {
      interpretado = interpretarPerfilTrabalhoHeuristico(descricaoLivre);
      origem = "heuristica";
    }

    return res.json({
      descricaoLivre,
      areasFoco: interpretado.areasFoco,
      resumo: interpretado.resumo,
      origem,
    });
  } catch (erro) {
    console.error("Erro ao interpretar perfil de trabalho:", erro);
    return res.status(500).json({ erro: "Não foi possível entender a descrição agora. Tente novamente." });
  }
});

// Passo 2 (PESSOA CONFIRMA → MOVA APLICA): só agora grava — `areasFoco`
// nunca é aplicado sem revalidação contra o vocabulário fixo
// (AREAS_FOCO_VALIDAS, em lib/ia.ts), então um valor forjado no corpo nunca
// entra numa área inexistente.
router.post("/me/perfil-trabalho/confirmar", async (req, res) => {
  const resultado = confirmarPerfilTrabalhoSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }
  const { descricaoLivre, areasFoco, resumo, origem } = resultado.data;

  try {
    const validado = validarPerfilTrabalho(JSON.stringify({ areasFoco, resumo }));

    const perfilParaSalvar = {
      descricaoLivre,
      areasFoco: validado.areasFoco,
      resumo: validado.resumo,
      origem,
      geradoEm: new Date().toISOString(),
    };

    await prisma.usuario.update({ where: { id: req.usuario!.id }, data: { perfilTrabalho: perfilParaSalvar } });

    return res.json({ perfilTrabalho: perfilParaSalvar });
  } catch (erro) {
    console.error("Erro ao confirmar perfil de trabalho:", erro);
    return res.status(500).json({ erro: "Não foi possível salvar seu perfil de trabalho agora. Tente novamente." });
  }
});

export default router;
