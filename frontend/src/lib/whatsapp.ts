/**
 * Normaliza um telefone brasileiro para o formato internacional (só dígitos,
 * com DDI 55) exigido pelo link wa.me.
 *
 * Cadastro manual nunca inclui o DDI — a máscara do formulário limita a 11
 * dígitos (DDD + número) — mas importação por CSV/XLSX grava o valor como a
 * planilha trouxer, às vezes já com "55" na frente. Por isso a decisão não
 * pode ser só "os dígitos começam com 55": o DDD 55 (Santa Maria/RS e
 * região) faz um número nacional legítimo começar com "55" também — ex.:
 * "55988887777" (DDD 55 + celular) tem 11 dígitos, não é um número
 * internacional. A distinção correta é pelo tamanho: nacional (DDD +
 * telefone) tem 10-11 dígitos; com DDI (55 + DDD + telefone) tem 12-13.
 */
function formatarNumeroWhatsapp(numero: string): string {
  const digitos = numero.replace(/\D/g, "");
  const jaTemDDI = digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13);
  return jaTemDDI ? digitos : `55${digitos}`;
}

interface DadosMensagemOrcamento {
  nomeCliente: string;
  nomeEmpresa: string;
  total: string;
  link: string;
}

function montarMensagem({ nomeCliente, nomeEmpresa, total, link }: DadosMensagemOrcamento): string {
  const totalFormatado = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(total)
  );
  return `Olá, ${nomeCliente}. Segue seu orçamento da ${nomeEmpresa}.\nValor total: ${totalFormatado}.\nConfira os detalhes do orçamento: ${link}`;
}

/**
 * Monta o link wa.me para compartilhar o orçamento. Se o cliente não tiver
 * WhatsApp/telefone cadastrado, o link abre sem destinatário fixo — quem
 * está enviando escolhe o contato manualmente no WhatsApp.
 */
export function montarLinkCompartilhamento(
  dados: DadosMensagemOrcamento & { whatsappCliente?: string | null; telefoneCliente?: string | null }
): string {
  const mensagem = montarMensagem(dados);
  const numero = dados.whatsappCliente || dados.telefoneCliente;
  const base = numero
    ? `https://wa.me/${formatarNumeroWhatsapp(numero)}`
    : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(mensagem)}`;
}

/**
 * Link wa.me com um texto livre já editado pelo usuário (ex.: follow-up
 * sugerido pela IA e revisado antes de enviar) — mesmo princípio: o envio de
 * verdade sempre acontece no app do WhatsApp, o MOVA nunca envia sozinho.
 */
export function montarLinkWhatsappTexto(numero: string | null | undefined, texto: string): string {
  const base = montarLinkChat(numero);
  return `${base}?text=${encodeURIComponent(texto)}`;
}

/**
 * Link wa.me direto para a conversa, sem mensagem pré-preenchida — usado
 * onde só faz sentido abrir o chat (ex.: contato da empresa na página
 * pública, botão "Chamar no WhatsApp" na lista de clientes).
 */
export function montarLinkChat(numero: string | null | undefined): string {
  return numero ? `https://wa.me/${formatarNumeroWhatsapp(numero)}` : "https://wa.me/";
}
