import { prisma } from "./prisma";
import { concederDiasBonus, DIAS_BONUS_INDICADO, gerarCodigoIndicacaoCandidato, totalDiasIndicador } from "./planos";
import type { Prisma } from "@prisma/client";

type TransacaoPrisma = Prisma.TransactionClient;

/** Gera um código de indicação garantidamente único, com poucas tentativas (colisão é raríssima). */
export async function gerarCodigoIndicacaoUnico(tx: TransacaoPrisma): Promise<string> {
  for (let tentativa = 0; tentativa < 10; tentativa++) {
    const candidato = gerarCodigoIndicacaoCandidato();
    const existente = await tx.empresa.findUnique({ where: { codigoIndicacao: candidato }, select: { id: true } });
    if (!existente) return candidato;
  }
  throw new Error("Não foi possível gerar um código de indicação único após 10 tentativas.");
}

/**
 * Registra o vínculo de indicação (status PENDENTE) no momento do cadastro
 * da nova empresa — nunca depois. Não concede nenhum benefício ainda; isso
 * só acontece em `validarIndicacaoSeElegivel`, quando a empresa indicada
 * comprovar uso real do produto.
 *
 * Retorna silenciosamente (sem lançar) para qualquer código inválido ou
 * autoindicação — um código de indicação errado nunca deve impedir um
 * cadastro legítimo.
 */
export async function vincularIndicacaoSeValida(
  tx: TransacaoPrisma,
  codigoIndicacaoInformado: string | undefined,
  novaEmpresaId: string
): Promise<void> {
  if (!codigoIndicacaoInformado) return;

  const codigo = codigoIndicacaoInformado.trim().toUpperCase();
  if (!codigo) return;

  const indicador = await tx.empresa.findUnique({ where: { codigoIndicacao: codigo }, select: { id: true } });
  if (!indicador) return; // código inexistente: ignora silenciosamente, não bloqueia o cadastro

  // Nota: `novaEmpresaId` é gerado agora, na criação — nunca pode coincidir
  // com o id de uma empresa já existente. Isso bloqueia por construção a
  // "autoindicação" no sentido literal (empresa se indicando com o próprio
  // código já ativo), mas NÃO impede a mesma pessoa criar uma segunda
  // empresa com outro e-mail para farmar recompensa — isso exigiria
  // verificação de identidade (telefone/documento), fora do escopo desta
  // etapa. Documentado como risco residual conhecido.

  await tx.indicacao.create({
    data: { indicadorId: indicador.id, indicadoId: novaEmpresaId },
  });
}

/**
 * Critério de ativação (indicação válida): a empresa indicada precisa ter,
 * no mínimo, 1 cliente + 1 produto + 1 orçamento criados — ou seja, ter
 * efetivamente percorrido o fluxo real do produto, não só criado a conta.
 * Chamada após qualquer criação de cliente/produto/orçamento; é barata
 * quando não há indicação pendente (uma query indexada por indicadoId) e
 * idempotente (só age se o status ainda for PENDENTE).
 */
export async function validarIndicacaoSeElegivel(empresaId: string): Promise<void> {
  const indicacao = await prisma.indicacao.findUnique({
    where: { indicadoId: empresaId },
    select: { id: true, status: true, indicadorId: true },
  });
  if (!indicacao || indicacao.status !== "PENDENTE") return;

  const [qtdClientes, qtdProdutos, qtdOrcamentos] = await Promise.all([
    prisma.cliente.count({ where: { empresaId } }),
    prisma.produto.count({ where: { empresaId } }),
    prisma.orcamento.count({ where: { empresaId } }),
  ]);

  if (qtdClientes < 1 || qtdProdutos < 1 || qtdOrcamentos < 1) return;

  await prisma.$transaction(async (tx) => {
    // updateMany com status=PENDENTE na própria cláusula where (em vez de um
    // findUnique + update separados) torna a transição atômica no nível do
    // banco: sob concorrência, só uma das requisições simultâneas consegue
    // count=1 aqui — a outra vê count=0 e sai sem conceder bônus de novo.
    const atualizacao = await tx.indicacao.updateMany({
      where: { id: indicacao.id, status: "PENDENTE" },
      data: { status: "VALIDA", validadaEm: new Date() },
    });
    if (atualizacao.count === 0) return;

    // Benefício de quem foi indicado: bônus único de 14 dias.
    await concederDiasBonus(tx, empresaId, DIAS_BONUS_INDICADO);

    // Benefício de quem indicou: progressão 7/14/21/28/30, sem reiniciar —
    // calcula o incremento real (pode ser 0 se já tiver atingido o teto).
    const contagemAntes = await tx.indicacao.count({
      where: { indicadorId: indicacao.indicadorId, status: "VALIDA" },
    });
    // A própria indicação recém-marcada já conta nessa contagem; contagemAntes
    // aqui já é o "depois" (n). O "antes" é n-1.
    const n = contagemAntes;
    const incremento = totalDiasIndicador(n) - totalDiasIndicador(n - 1);
    await concederDiasBonus(tx, indicacao.indicadorId, incremento);
  });
}
