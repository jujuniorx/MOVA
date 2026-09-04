import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { perguntarIASchema, transcreverAudioSchema } from "../schemas/ia.schema";
import { planoEfetivo } from "../lib/planos";
import {
  capacidadesDisponiveis,
  executarCapacidadeIA,
  iaConfigurada,
  limiteMensalExcedido,
  transcreverAudio,
  transcricaoConfigurada,
  validarCatalogoEstruturado,
  validarSugestaoSegmento,
} from "../lib/ia";

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

  let resultadoIA;
  try {
    resultadoIA = await executarCapacidadeIA(empresaId, resultado.data.capacidade, {
      clienteNome,
      observacoes: resultado.data.observacoes,
    });
  } catch (erro) {
    console.error("Erro ao executar capacidade de IA:", erro);
    return res.status(502).json({ erro: erro instanceof Error ? erro.message : "Não foi possível obter uma resposta da IA agora." });
  }

  // O uso é registrado mesmo que a validação abaixo falhe — a chamada ao
  // modelo já aconteceu e já tem custo real, independente do formato da
  // resposta.
  await prisma.usoIA.create({
    data: {
      empresaId,
      operacao: resultado.data.capacidade,
      modelo: resultadoIA.modelo,
      tokensEntrada: resultadoIA.tokensEntrada,
      tokensSaida: resultadoIA.tokensSaida,
    },
  });

  try {
    if (resultado.data.capacidade === "sugerir_produtos_segmento") {
      return res.json({ dados: validarSugestaoSegmento(resultadoIA.texto) });
    }
    if (resultado.data.capacidade === "estruturar_catalogo_texto") {
      return res.json({ dados: validarCatalogoEstruturado(resultadoIA.texto) });
    }
    return res.json({ resposta: resultadoIA.texto });
  } catch (erro) {
    console.error("Erro ao validar resposta estruturada da IA:", erro);
    return res.status(502).json({ erro: erro instanceof Error ? erro.message : "Não foi possível interpretar a resposta da IA." });
  }
});

// Cadastro de catálogo por áudio: transcreve e devolve só o TEXTO — a
// estruturação em produtos/preços continua passando por /ia/perguntar
// (capacidade "estruturar_catalogo_texto"), reaproveitando a mesma validação
// e o mesmo aviso de "não inventar" que o texto digitado já tem. Requer o
// mesmo nível de plano da estruturação de catálogo (Business/Pro).
router.post("/catalogo/transcrever", async (req, res) => {
  const resultado = transcreverAudioSchema.safeParse(req.body);
  if (!resultado.success) return res.status(400).json({ erro: resultado.error.issues[0].message });

  const empresaId = req.usuario!.empresaId;
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { planoTipo: true, trialBonusAteEm: true },
  });
  const plano = planoEfetivo(empresa);

  if (!capacidadesDisponiveis(plano).includes("estruturar_catalogo_texto")) {
    return res.status(403).json({ erro: "Cadastro por áudio não está disponível no seu plano.", codigo: "IA_NAO_DISPONIVEL_NO_PLANO" });
  }
  if (!transcricaoConfigurada()) {
    return res.status(503).json({ erro: "Transcrição de áudio não está configurada neste ambiente." });
  }
  if (await limiteMensalExcedido(empresaId, plano)) {
    return res.status(429).json({ erro: "Limite mensal de uso de IA do seu plano atingido.", codigo: "IA_LIMITE_MENSAL" });
  }

  try {
    const texto = await transcreverAudio(resultado.data.audioBase64, resultado.data.tipoMime);
    await prisma.usoIA.create({ data: { empresaId, operacao: "transcrever_audio" } });
    return res.json({ texto });
  } catch (erro) {
    console.error("Erro ao transcrever áudio:", erro);
    return res.status(502).json({ erro: "Não foi possível transcrever o áudio agora." });
  }
});

export default router;
