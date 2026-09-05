/**
 * Normaliza um telefone brasileiro para o formato internacional (só dígitos,
 * com DDI 55) exigido pelo link wa.me.
 */
function formatarNumeroWhatsapp(numero: string): string {
  const digitos = numero.replace(/\D/g, "");
  return digitos.startsWith("55") ? digitos : `55${digitos}`;
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
  const base = numero ? `https://wa.me/${formatarNumeroWhatsapp(numero)}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(texto)}`;
}
