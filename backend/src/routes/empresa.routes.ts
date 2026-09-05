import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { empresaSelectPropria } from "../lib/empresaSelect";
import { empresaUpdateSchema } from "../schemas/empresa.schema";
import { contextoProcessoEnum, processoUpdateSchema } from "../schemas/processo.schema";
import { MODULOS, modulosAtivos, moduloEstaAtivo, alterarModuloEmpresa } from "../lib/modulos";
import { alterarModuloSchema } from "../schemas/modulos.schema";

const router = Router();

router.use(autenticar);

// Sem parâmetro de ID: a empresa afetada é sempre a do usuário autenticado
// (req.usuario.empresaId), nunca uma vinda do corpo da requisição ou da URL.

router.get("/", async (req, res) => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: req.usuario!.empresaId },
      select: empresaSelectPropria,
    });

    if (!empresa) {
      return res.status(404).json({ erro: "Empresa não encontrada." });
    }

    return res.json(empresa);
  } catch (erro) {
    console.error("Erro ao buscar dados da empresa:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar os dados da empresa." });
  }
});

router.patch("/", async (req, res) => {
  const resultado = empresaUpdateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  try {
    const empresa = await prisma.empresa.update({
      where: { id: req.usuario!.empresaId },
      data: resultado.data,
      select: empresaSelectPropria,
    });

    return res.json(empresa);
  } catch (erro) {
    if (erro && typeof erro === "object" && "code" in erro && (erro as { code?: string }).code === "P2002") {
      return res.status(409).json({ erro: "Este endereço de página pública já está em uso. Escolha outro." });
    }
    console.error("Erro ao atualizar dados da empresa:", erro);
    return res.status(500).json({ erro: "Não foi possível atualizar os dados da empresa." });
  }
});

// Módulos opcionais (Etapa 5 — "arquitetura modular"). Devolve o catálogo
// inteiro (para a tela de Configurações poder explicar cada um, mesmo os
// ainda não implementados) já resolvido contra o que ESTA empresa tem ativo
// — o frontend nunca precisa reimplementar a lógica de módulo sempreAtivo
// nem o default para empresas antigas sem `modulosAtivos` salvo.
router.get("/modulos", async (req, res) => {
  try {
    const empresa = await prisma.empresa.findUniqueOrThrow({
      where: { id: req.usuario!.empresaId },
      select: { modulosAtivos: true },
    });
    const ativos = modulosAtivos(empresa.modulosAtivos);
    const catalogo = Object.values(MODULOS).map((m) => ({
      id: m.id,
      nome: m.nome,
      descricao: m.descricao,
      dependeDe: m.dependeDe,
      sempreAtivo: Boolean(m.sempreAtivo),
      implementado: m.implementado,
      ativo: moduloEstaAtivo(ativos, m.id),
    }));
    return res.json({ modulos: catalogo });
  } catch (erro) {
    console.error("Erro ao buscar módulos da empresa:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar os módulos." });
  }
});

// Ativa/desativa UM módulo por vez — nunca apaga dado nenhum, só muda o que
// aparece na experiência da empresa. Validação de dependências (nos dois
// sentidos) e do "sempreAtivo" acontece inteiramente no backend
// (alterarModuloEmpresa) — o frontend pode desabilitar botões por UX, mas
// nunca é a autoridade real sobre o que pode ou não ser alterado.
router.patch("/modulos", async (req, res) => {
  const resultado = alterarModuloSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  try {
    const alteracao = await alterarModuloEmpresa(req.usuario!.empresaId, resultado.data.moduloId, resultado.data.ativo);
    if (!alteracao.ok) {
      return res.status(409).json({ erro: alteracao.erro });
    }
    return res.status(204).send();
  } catch (erro) {
    console.error("Erro ao alterar módulo da empresa:", erro);
    return res.status(500).json({ erro: "Não foi possível alterar este módulo agora." });
  }
});

const includeEtapas = { etapas: { orderBy: { ordem: "asc" as const } } };

// Processo configurável (Etapa 2 — "como funciona seu processo?"). Só o
// contexto ORCAMENTO existe hoje; :contexto já valida contra o enum, então
// nunca vira uma chave arbitrária.
router.get("/processos/:contexto", async (req, res) => {
  const contextoResultado = contextoProcessoEnum.safeParse(req.params.contexto);
  if (!contextoResultado.success) {
    return res.status(400).json({ erro: "Processo inválido." });
  }

  try {
    const processo = await prisma.processoConfig.findUnique({
      where: { empresaId_contexto: { empresaId: req.usuario!.empresaId, contexto: contextoResultado.data } },
      include: includeEtapas,
    });

    return res.json(processo);
  } catch (erro) {
    console.error("Erro ao buscar processo configurável:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar o processo." });
  }
});

// Substitui o processo inteiro (nome + todas as etapas) numa transação —
// mesmo padrão de "apaga e recria" já usado para campos personalizados.
router.put("/processos/:contexto", async (req, res) => {
  const contextoResultado = contextoProcessoEnum.safeParse(req.params.contexto);
  if (!contextoResultado.success) {
    return res.status(400).json({ erro: "Processo inválido." });
  }

  const resultado = processoUpdateSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  const empresaId = req.usuario!.empresaId;
  const contexto = contextoResultado.data;

  try {
    const processo = await prisma.$transaction(async (tx) => {
      const existente = await tx.processoConfig.upsert({
        where: { empresaId_contexto: { empresaId, contexto } },
        update: { nome: resultado.data.nome },
        create: { empresaId, contexto, nome: resultado.data.nome },
      });

      // Etapas em uso por algum orçamento perdem só o vínculo (onDelete:
      // SetNull no schema) — nunca apagamos ou bloqueamos o orçamento em si.
      await tx.etapaProcesso.deleteMany({ where: { processoConfigId: existente.id } });

      for (let indice = 0; indice < resultado.data.etapas.length; indice++) {
        const etapa = resultado.data.etapas[indice];
        await tx.etapaProcesso.create({
          data: {
            processoConfigId: existente.id,
            nome: etapa.nome,
            cor: etapa.cor,
            statusBase: etapa.statusBase,
            ordem: indice,
          },
        });
      }

      return tx.processoConfig.findUniqueOrThrow({
        where: { id: existente.id },
        include: includeEtapas,
      });
    });

    return res.json(processo);
  } catch (erro) {
    console.error("Erro ao atualizar processo configurável:", erro);
    return res.status(500).json({ erro: "Não foi possível atualizar o processo." });
  }
});

export default router;
