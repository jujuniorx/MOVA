import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { perguntarIASchema, transcreverAudioSchema, estimarPrecoImagemSchema } from "../schemas/ia.schema";
import { idParamSchema } from "../schemas/common.schema";
import { planoEfetivo } from "../lib/planos";
import { registrarEvento } from "../lib/historico";
import {
  capacidadesDisponiveis,
  executarCapacidadeIA,
  iaConfigurada,
  reservarUsoIA,
  finalizarUsoIA,
  liberarReservaUsoIA,
  transcreverAudio,
  transcricaoConfigurada,
  validarCatalogoEstruturado,
  validarSugestaoSegmento,
  validarEstimativaPreco,
  estimarPrecoPorImagem,
  detectarPrioridades,
  ErroProvedorIA,
} from "../lib/ia";
import { exigirModulo, modulosAtivos } from "../lib/modulos";

// Traduz o código tipado de ErroProvedorIA em status HTTP — nunca deixa uma
// falha do provedor (chave inválida, sem crédito, limite de taxa, timeout,
// indisponibilidade, resposta fora do formato) virar um 500 genérico nem
// derrubar a requisição sem explicação.
function statusParaErroIA(codigo: ErroProvedorIA["codigo"]): number {
  switch (codigo) {
    case "LIMITE_TAXA":
    case "SEM_CREDITO":
      return 429;
    case "TIMEOUT":
      return 504;
    case "RESPOSTA_INVALIDA":
      return 502;
    case "CHAVE_INVALIDA":
    case "INDISPONIVEL":
    default:
      return 503;
  }
}

const router = Router();

router.use(autenticar);
router.use(exigirModulo("ia"));

// Central "o que precisa da sua atenção?" — 100% determinístico (ver
// lib/ia.ts::detectarPrioridades), sem custo de IA e sem gate de plano: são
// consultas normais ao banco desta empresa, não uma chamada ao provedor.
router.get("/prioridades", async (req, res) => {
  try {
    const itens = await detectarPrioridades(req.usuario!.empresaId);
    return res.json({ itens });
  } catch (erro) {
    console.error("Erro ao detectar prioridades:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar as prioridades agora." });
  }
});

router.get("/capacidades", async (req, res) => {
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: req.usuario!.empresaId },
    select: { id: true, planoTipo: true, trialBonusAteEm: true, modulosAtivos: true },
  });
  const plano = await planoEfetivo(empresa);
  return res.json({ configurado: iaConfigurada(), plano, capacidades: capacidadesDisponiveis(plano, modulosAtivos(empresa.modulosAtivos)) });
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
    select: { id: true, planoTipo: true, trialBonusAteEm: true, modulosAtivos: true },
  });
  const plano = await planoEfetivo(empresa);

  if (!capacidadesDisponiveis(plano, modulosAtivos(empresa.modulosAtivos)).includes(resultado.data.capacidade)) {
    return res.status(403).json({
      erro: plano === "GRATUITO" || plano === "START" ? "Seu plano não inclui recursos de IA." : "Este recurso de IA não está disponível no seu plano.",
      codigo: "IA_NAO_DISPONIVEL_NO_PLANO",
    });
  }

  if (!iaConfigurada()) {
    return res.status(503).json({ erro: "A funcionalidade de IA não está configurada neste ambiente." });
  }

  const reservaUsoIA = await reservarUsoIA(empresaId, plano, resultado.data.capacidade);
  if (reservaUsoIA === null) {
    return res.status(429).json({ erro: "Limite mensal de uso de IA do seu plano atingido.", codigo: "IA_LIMITE_MENSAL" });
  }

  let clienteNome: string | undefined;
  if (resultado.data.clienteId) {
    const cliente = await prisma.cliente.findFirst({ where: { id: resultado.data.clienteId, empresaId }, select: { nome: true } });
    if (!cliente) {
      await liberarReservaUsoIA(reservaUsoIA);
      return res.status(404).json({ erro: "Cliente não encontrado." });
    }
    clienteNome = cliente.nome;
  }

  let diasParado: number | undefined;
  let orcamentoParaFollowup: { id: string; numero: number } | undefined;
  if (resultado.data.capacidade === "sugerir_followup") {
    if (!resultado.data.orcamentoId) {
      await liberarReservaUsoIA(reservaUsoIA);
      return res.status(400).json({ erro: "Informe o orçamento para sugerir um follow-up." });
    }
    const orcamento = await prisma.orcamento.findFirst({
      where: { id: resultado.data.orcamentoId, empresaId },
      select: { id: true, numero: true, status: true, atualizadoEm: true, cliente: { select: { nome: true } } },
    });
    if (!orcamento) {
      await liberarReservaUsoIA(reservaUsoIA);
      return res.status(404).json({ erro: "Orçamento não encontrado." });
    }
    if (orcamento.status !== "ENVIADO") {
      await liberarReservaUsoIA(reservaUsoIA);
      return res.status(409).json({ erro: "Só é possível sugerir follow-up para um orçamento enviado e ainda sem resposta." });
    }
    // Anti-spam: não sugere de novo se já sugeriu nas últimas 24h para o mesmo orçamento.
    const sugestaoRecente = await prisma.eventoHistorico.findFirst({
      where: { empresaId, tipo: "FOLLOWUP_SUGERIDO", entidadeId: orcamento.id, criadoEm: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (sugestaoRecente) {
      await liberarReservaUsoIA(reservaUsoIA);
      return res.status(429).json({ erro: "Já foi sugerido um follow-up para este orçamento nas últimas 24 horas.", codigo: "FOLLOWUP_RECENTE" });
    }
    clienteNome = orcamento.cliente.nome;
    diasParado = Math.floor((Date.now() - orcamento.atualizadoEm.getTime()) / 86_400_000);
    orcamentoParaFollowup = { id: orcamento.id, numero: orcamento.numero };
  }

  let resultadoIA;
  try {
    resultadoIA = await executarCapacidadeIA(empresaId, resultado.data.capacidade, {
      clienteNome,
      observacoes: resultado.data.observacoes,
      diasParado,
    });
  } catch (erro) {
    console.error("Erro ao executar capacidade de IA:", erro);
    await liberarReservaUsoIA(reservaUsoIA);
    if (erro instanceof ErroProvedorIA) {
      return res.status(statusParaErroIA(erro.codigo)).json({ erro: erro.message, codigo: erro.codigo });
    }
    // Nunca repassa `erro.message` de uma exceção genérica ao cliente — só
    // ErroProvedorIA (tipado, com mensagens escritas para o usuário final)
    // tem essa garantia; qualquer outro erro (ex.: falha do banco dentro de
    // uma função de busca de contexto) fica só no log do servidor.
    return res.status(502).json({ erro: "Não foi possível obter uma resposta da IA agora." });
  }

  // O uso é registrado mesmo que a validação abaixo falhe — a chamada ao
  // modelo já aconteceu e já tem custo real, independente do formato da
  // resposta. custoEstimadoUsd nunca é a fatura real do provedor — é uma
  // estimativa a partir dos tokens informados e da tabela de preços em
  // lib/ia.ts, só para o empresário (e o MOVA) acompanharem tendência de
  // custo, nunca usada para cobrança.
  await finalizarUsoIA(reservaUsoIA, {
    modelo: resultadoIA.modelo,
    tokensEntrada: resultadoIA.tokensEntrada,
    tokensSaida: resultadoIA.tokensSaida,
    custoEstimadoUsd: resultadoIA.custoEstimadoUsd,
  });

  if (orcamentoParaFollowup) {
    registrarEvento({
      empresaId,
      tipo: "FOLLOWUP_SUGERIDO",
      entidadeTipo: "Orcamento",
      entidadeId: orcamentoParaFollowup.id,
      descricao: `Follow-up sugerido pela IA para o orçamento #${orcamentoParaFollowup.numero} — aguardando revisão humana antes de enviar.`,
    }).catch((e) => console.error("Erro ao registrar histórico:", e));
  }

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
    return res.status(502).json({ erro: "Não foi possível interpretar a resposta da IA." });
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
    select: { id: true, planoTipo: true, trialBonusAteEm: true },
  });
  const plano = await planoEfetivo(empresa);

  if (!capacidadesDisponiveis(plano).includes("estruturar_catalogo_texto")) {
    return res.status(403).json({ erro: "Cadastro por áudio não está disponível no seu plano.", codigo: "IA_NAO_DISPONIVEL_NO_PLANO" });
  }
  if (!transcricaoConfigurada()) {
    return res.status(503).json({ erro: "Transcrição de áudio não está configurada neste ambiente." });
  }
  const reservaUsoIA = await reservarUsoIA(empresaId, plano, "transcrever_audio");
  if (reservaUsoIA === null) {
    return res.status(429).json({ erro: "Limite mensal de uso de IA do seu plano atingido.", codigo: "IA_LIMITE_MENSAL" });
  }

  try {
    const texto = await transcreverAudio(resultado.data.audioBase64, resultado.data.tipoMime);
    await finalizarUsoIA(reservaUsoIA, { modelo: "whisper-1" });
    return res.json({ texto });
  } catch (erro) {
    console.error("Erro ao transcrever áudio:", erro);
    await liberarReservaUsoIA(reservaUsoIA);
    if (erro instanceof ErroProvedorIA) {
      return res.status(statusParaErroIA(erro.codigo)).json({ erro: erro.message, codigo: erro.codigo });
    }
    return res.status(502).json({ erro: "Não foi possível transcrever o áudio agora." });
  }
});

// "Quanto devo cobrar?" a partir de uma foto — usa o mesmo gate de plano da
// estruturação de catálogo (é a capacidade mais próxima em maturidade/custo).
// NUNCA altera preço de catálogo sozinha: só devolve uma sugestão estruturada
// para o empresário revisar e, se quiser, digitar manualmente no produto.
router.post("/estimar-preco-imagem", async (req, res) => {
  const resultado = estimarPrecoImagemSchema.safeParse(req.body);
  if (!resultado.success) return res.status(400).json({ erro: resultado.error.issues[0].message });

  const empresaId = req.usuario!.empresaId;
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { id: true, planoTipo: true, trialBonusAteEm: true },
  });
  const plano = await planoEfetivo(empresa);

  if (!capacidadesDisponiveis(plano).includes("estruturar_catalogo_texto")) {
    return res.status(403).json({ erro: "Estimativa de preço por imagem não está disponível no seu plano.", codigo: "IA_NAO_DISPONIVEL_NO_PLANO" });
  }
  if (!iaConfigurada()) {
    return res.status(503).json({ erro: "A funcionalidade de IA não está configurada neste ambiente." });
  }
  const reservaUsoIA = await reservarUsoIA(empresaId, plano, "estimar_preco_imagem");
  if (reservaUsoIA === null) {
    return res.status(429).json({ erro: "Limite mensal de uso de IA do seu plano atingido.", codigo: "IA_LIMITE_MENSAL" });
  }

  let resultadoIA;
  try {
    resultadoIA = await estimarPrecoPorImagem(empresaId, resultado.data.imagemBase64, resultado.data.tipoMime, resultado.data.descricao);
  } catch (erro) {
    console.error("Erro ao estimar preço por imagem:", erro);
    await liberarReservaUsoIA(reservaUsoIA);
    if (erro instanceof ErroProvedorIA) {
      return res.status(statusParaErroIA(erro.codigo)).json({ erro: erro.message, codigo: erro.codigo });
    }
    return res.status(502).json({ erro: "Não foi possível analisar a imagem agora." });
  }

  await finalizarUsoIA(reservaUsoIA, {
    modelo: resultadoIA.modelo,
    tokensEntrada: resultadoIA.tokensEntrada,
    tokensSaida: resultadoIA.tokensSaida,
    custoEstimadoUsd: resultadoIA.custoEstimadoUsd,
  });

  try {
    return res.json({ dados: validarEstimativaPreco(resultadoIA.texto) });
  } catch (erro) {
    console.error("Erro ao validar estimativa de preço:", erro);
    return res.status(502).json({ erro: "Não foi possível interpretar a resposta da IA." });
  }
});

export default router;
