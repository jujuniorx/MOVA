import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { totalDiasIndicador } from "../lib/planos";

const router = Router();

router.use(autenticar);

// Sem parâmetro de ID: sempre os dados da própria empresa autenticada,
// nunca de outra — mesmo padrão já usado em /empresa.
router.get("/minha", async (req, res) => {
  const empresaId = req.usuario!.empresaId;

  try {
    const [empresa, indicacoesValidas, indicacoesPendentes, indicacaoRecebida] = await Promise.all([
      prisma.empresa.findUniqueOrThrow({
        where: { id: empresaId },
        select: { codigoIndicacao: true, trialBonusAteEm: true },
      }),
      prisma.indicacao.count({ where: { indicadorId: empresaId, status: "VALIDA" } }),
      prisma.indicacao.count({ where: { indicadorId: empresaId, status: "PENDENTE" } }),
      prisma.indicacao.findUnique({ where: { indicadoId: empresaId }, select: { status: true } }),
    ]);

    const proximoTeto = totalDiasIndicador(5);
    const diasJaGarantidos = totalDiasIndicador(indicacoesValidas);

    return res.json({
      codigoIndicacao: empresa.codigoIndicacao,
      trialBonusAteEm: empresa.trialBonusAteEm,
      indicacoesValidas,
      indicacoesPendentes,
      diasGarantidosPeloPrograma: diasJaGarantidos,
      tetoDiasPrograma: proximoTeto,
      tetoAtingido: diasJaGarantidos >= proximoTeto,
      foiIndicadaPor: indicacaoRecebida ? indicacaoRecebida.status : null,
    });
  } catch (erro) {
    console.error("Erro ao carregar dados de indicação:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar os dados de indicação." });
  }
});

export default router;
