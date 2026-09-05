import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { idParamSchema } from "../schemas/common.schema";
import { enviarMensagemSchema, conectarWhatsAppSchema } from "../schemas/whatsapp.schema";
import { enviarMensagemTexto, whatsappConfigurado, validarAssinaturaWebhookWhatsApp } from "../lib/whatsapp";
import { registrarEvento } from "../lib/historico";
import { exigirModulo } from "../lib/modulos";

const router = Router();

router.use(autenticar);
// Só a gestão autenticada (status/conectar/conversas/enviar) é bloqueada
// pelo módulo — o webhook público (`receberWebhookWhatsApp`, montado à parte
// em server.ts) NUNCA é bloqueado: uma mensagem recebida de um cliente real
// não pode ser perdida só porque a empresa desativou a experiência de
// WhatsApp no MOVA. Desativar o módulo esconde a tela, nunca descarta dado.
router.use(exigirModulo("whatsapp"));

router.get("/status", async (req, res) => {
  const conta = await prisma.contaWhatsApp.findUnique({ where: { empresaId: req.usuario!.empresaId } });
  return res.json({ configurado: whatsappConfigurado(), conta });
});

// Registra o número da empresa para receber/enviar mensagens. "conectada"
// só reflete se HÁ credenciais reais no ambiente — nunca é forçado para true.
router.post("/conectar", async (req, res) => {
  const resultado = conectarWhatsAppSchema.safeParse(req.body);
  if (!resultado.success) return res.status(400).json({ erro: resultado.error.issues[0].message });

  const conta = await prisma.contaWhatsApp.upsert({
    where: { empresaId: req.usuario!.empresaId },
    create: { empresaId: req.usuario!.empresaId, numeroTelefone: resultado.data.numeroTelefone, conectada: whatsappConfigurado() },
    update: { numeroTelefone: resultado.data.numeroTelefone, conectada: whatsappConfigurado() },
  });
  return res.json(conta);
});

router.get("/conversas", async (req, res) => {
  const conversas = await prisma.conversaWhatsApp.findMany({
    where: { empresaId: req.usuario!.empresaId },
    orderBy: { ultimaMensagemEm: "desc" },
    include: { cliente: { select: { id: true, nome: true } } },
    take: 200,
  });
  return res.json(conversas);
});

router.get("/conversas/:id/mensagens", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });

  const conversa = await prisma.conversaWhatsApp.findFirst({
    where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
  });
  if (!conversa) return res.status(404).json({ erro: "Conversa não encontrada." });

  const mensagens = await prisma.mensagemWhatsApp.findMany({
    where: { conversaId: conversa.id },
    orderBy: { criadoEm: "asc" },
    take: 500,
  });
  return res.json(mensagens);
});

router.post("/conversas/:id/mensagens", async (req, res) => {
  const idResultado = idParamSchema.safeParse(req.params.id);
  if (!idResultado.success) return res.status(400).json({ erro: "ID inválido." });

  const corpo = enviarMensagemSchema.safeParse(req.body);
  if (!corpo.success) return res.status(400).json({ erro: corpo.error.issues[0].message });

  const conversa = await prisma.conversaWhatsApp.findFirst({
    where: { id: idResultado.data, empresaId: req.usuario!.empresaId },
  });
  if (!conversa) return res.status(404).json({ erro: "Conversa não encontrada." });

  if (!whatsappConfigurado()) {
    return res.status(503).json({ erro: "Integração com WhatsApp não configurada neste ambiente." });
  }

  try {
    await enviarMensagemTexto(conversa.contatoTelefone, corpo.data.texto);
    const mensagem = await prisma.mensagemWhatsApp.create({
      data: { conversaId: conversa.id, direcao: "ENVIADA", conteudo: corpo.data.texto },
    });
    await prisma.conversaWhatsApp.update({ where: { id: conversa.id }, data: { ultimaMensagemEm: new Date() } });
    return res.status(201).json(mensagem);
  } catch (erro) {
    console.error("Erro ao enviar mensagem via WhatsApp:", erro);
    return res.status(502).json({ erro: "Não foi possível enviar a mensagem pelo WhatsApp." });
  }
});

export default router;

// --- Webhook público (fora do middleware `autenticar`) ---------------------

// Handshake de verificação exigido pela Meta na configuração do webhook.
export function verificarWebhookWhatsApp(req: import("express").Request, res: import("express").Response) {
  const modo = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const desafio = req.query["hub.challenge"];
  const tokenEsperado = process.env.WHATSAPP_VERIFY_TOKEN;

  if (modo === "subscribe" && tokenEsperado && token === tokenEsperado) {
    return res.status(200).send(desafio);
  }
  return res.status(403).send();
}

const DIGITOS_MINIMOS_PARA_COMPARAR = 8;

function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Compara os últimos N dígitos, ignorando DDI/formatação — ver comentário acima do uso. */
async function encontrarClientePorTelefone(empresaId: string, telefoneWhatsapp: string) {
  const alvoDigitos = apenasDigitos(telefoneWhatsapp);
  if (alvoDigitos.length < DIGITOS_MINIMOS_PARA_COMPARAR) return null;
  const alvoSufixo = alvoDigitos.slice(-DIGITOS_MINIMOS_PARA_COMPARAR);

  const candidatos = await prisma.cliente.findMany({
    where: {
      empresaId,
      OR: [{ whatsapp: { not: null } }, { telefone: { not: null } }],
    },
    select: { id: true, whatsapp: true, telefone: true },
  });

  const encontrado = candidatos.find((cliente) => {
    for (const campo of [cliente.whatsapp, cliente.telefone]) {
      if (!campo) continue;
      const digitos = apenasDigitos(campo);
      if (digitos.length >= DIGITOS_MINIMOS_PARA_COMPARAR && digitos.endsWith(alvoSufixo)) return true;
    }
    return false;
  });

  return encontrado ? { id: encontrado.id } : null;
}

interface MensagemRecebidaWhatsApp {
  from: string;
  id: string;
  text?: { body?: string };
  type: string;
}

// Recebe mensagens de clientes via WhatsApp. Multi-tenant: identifica a
// empresa pelo número de telefone COMERCIAL que recebeu a mensagem
// (display_phone_number), nunca pelo remetente. Idempotente via `externoId`
// (wamid) — reentrega do mesmo evento nunca duplica a mensagem.
export async function receberWebhookWhatsApp(req: import("express").Request, res: import("express").Response) {
  const assinaturaValida = validarAssinaturaWebhookWhatsApp(req.rawBody, req.header("x-hub-signature-256"));
  if (!assinaturaValida) {
    console.error("Webhook WhatsApp: assinatura ausente ou inválida — requisição rejeitada.");
    return res.status(401).send();
  }

  res.status(200).send();

  try {
    const entradas = req.body?.entry ?? [];
    for (const entrada of entradas) {
      for (const mudanca of entrada.changes ?? []) {
        const valor = mudanca.value ?? {};
        const numeroComercial: string | undefined = valor.metadata?.display_phone_number;
        const mensagens: MensagemRecebidaWhatsApp[] = valor.messages ?? [];
        if (!numeroComercial || mensagens.length === 0) continue;

        const conta = await prisma.contaWhatsApp.findFirst({ where: { numeroTelefone: numeroComercial } });
        if (!conta) {
          console.error(`Webhook WhatsApp: nenhuma empresa conectada ao número ${numeroComercial}.`);
          continue;
        }

        for (const mensagem of mensagens) {
          if (mensagem.type !== "text") continue;

          // Relaciona a conversa a um Cliente já cadastrado quando o número
          // bate — nunca cria um Cliente novo a partir do webhook, e a
          // comparação é por sufixo de dígitos (não igualdade exata), porque
          // o WhatsApp manda o telefone com DDI ("5511987654321") enquanto o
          // cadastro geralmente guarda só DDD+número formatado
          // ("(11) 98765-4321"). Exige pelo menos 8 dígitos finais iguais
          // (um número de celular brasileiro inteiro sem DDD) para evitar
          // associação arriscada por coincidência parcial.
          const conversaExistente = await prisma.conversaWhatsApp.findUnique({
            where: { empresaId_contatoTelefone: { empresaId: conta.empresaId, contatoTelefone: mensagem.from } },
          });
          const clienteCorrespondente = conversaExistente?.clienteId
            ? null
            : await encontrarClientePorTelefone(conta.empresaId, mensagem.from);

          const conversa = await prisma.conversaWhatsApp.upsert({
            where: { empresaId_contatoTelefone: { empresaId: conta.empresaId, contatoTelefone: mensagem.from } },
            create: {
              empresaId: conta.empresaId,
              contatoTelefone: mensagem.from,
              clienteId: clienteCorrespondente?.id,
            },
            update: {
              ultimaMensagemEm: new Date(),
              ...(clienteCorrespondente ? { clienteId: clienteCorrespondente.id } : {}),
            },
          });

          await prisma.mensagemWhatsApp.create({
            data: {
              conversaId: conversa.id,
              direcao: "RECEBIDA",
              conteudo: mensagem.text?.body ?? "",
              externoId: mensagem.id,
            },
          });
        }
      }
    }
  } catch (erro) {
    if (erro && typeof erro === "object" && "code" in erro && (erro as { code?: string }).code === "P2002") {
      // Mensagem já registrada antes (reentrega do mesmo webhook) — ignora.
      return;
    }
    console.error("Erro ao processar webhook do WhatsApp:", erro);
  }
}
