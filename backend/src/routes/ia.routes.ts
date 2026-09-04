import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { perguntarIASchema } from "../schemas/ia.schema";
import { planoEfetivo } from "../lib/planos";
import { capacidadesDisponiveis, executarCapacidadeIA, iaConfigurada, limiteMensalExcedido } from "../lib/ia";

const router = Router();

router.use(autenticar);

router.get("/capacidades", async (req, res) => {
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: req.usuario!.empresaId },
    select: { planoTipo: true, trialBonusAteEm: true },
  });
  const plano = planoEfetivo(empresa);
  return res.json({ configurado: iaConfigurada(), plano, capacidades: capacidadesDisponiveis(plano) });
});

// A IA nunca executa nada diretamente (SQL, mudança de plano, pagamento,
// exclusão de dados) — só lê um recorte mínimo de dados já resumido e
// devolve texto. Qualquer ação sensível continua exigindo confirmação
// explícita do usuário em uma tela normal do MOVA.
router.post("/perguntar", async (req, res) => {
  const resultado = perguntarIASchema.safeParse(req.body);
  if (!resultado.success) return res.status(400).json({ erro: resultado.error.issues[0].message });

  const empresaId = req.usuario!.empresaId;
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { planoTipo: true, trialBonusAteEm: true },
  });
  const plano = planoEfetivo(empresa);

  if (!capacidadesDisponiveis(plano).includes(resultado.data.capacidade)) {
    return res.status(403).json({
      erro: plano === "GRATUITO" || plano === "START" ? "Seu plano não inclui recursos de IA." : "Este recurso de IA não está disponível no seu plano.",
      codigo: "IA_NAO_DISPONIVEL_NO_PLANO",
    });
  }

  if (!iaConfigurada()) {
    return res.status(503).json({ erro: "A funcionalidade de IA não está configurada neste ambiente." });
  }

  if (await limiteMensalExcedido(empresaId, plano)) {
    return res.status(429).json({ erro: "Limite mensal de uso de IA do seu plano atingido.", codigo: "IA_LIMITE_MENSAL" });
  }

  let clienteNome: string | undefined;
  if (resultado.data.clienteId) {
    const cliente = await prisma.cliente.findFirst({ where: { id: resultado.data.clienteId, empresaId }, select: { nome: true } });
    if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado." });
    clienteNome = cliente.nome;
  }

  try {
    const resultadoIA = await executarCapacidadeIA(empresaId, resultado.data.capacidade, {
      clienteNome,
      observacoes: resultado.data.observacoes,
    });

    await prisma.usoIA.create({
      data: {
        empresaId,
        operacao: resultado.data.capacidade,
        modelo: resultadoIA.modelo,
        tokensEntrada: resultadoIA.tokensEntrada,
        tokensSaida: resultadoIA.tokensSaida,
      },
    });

    return res.json({ resposta: resultadoIA.texto });
  } catch (erro) {
    console.error("Erro ao executar capacidade de IA:", erro);
    return res.status(502).json({ erro: "Não foi possível obter uma resposta da IA agora." });
  }
});

export default router;
