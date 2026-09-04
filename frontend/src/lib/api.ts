const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const CHAVE_TOKEN = "orcafacil_token";

export class ApiError extends Error {
  codigo?: string;
}

export function obterToken(): string | null {
  return localStorage.getItem(CHAVE_TOKEN);
}

export function salvarToken(token: string) {
  localStorage.setItem(CHAVE_TOKEN, token);
}

export function limparToken() {
  localStorage.removeItem(CHAVE_TOKEN);
}

async function apiFetch<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const token = obterToken();

  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      ...opcoes,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opcoes.headers,
      },
    });
  } catch {
    // fetch só rejeita por falha de rede/CORS, nunca por status HTTP — status
    // de erro (4xx/5xx) sempre resolve a Promise e cai no fluxo normal abaixo.
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
  }

  const corpo = resposta.status === 204 ? null : await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const mensagem =
      corpo && typeof corpo === "object" && "erro" in corpo
        ? String((corpo as { erro: unknown }).erro)
        : "Não foi possível concluir a operação. Tente novamente.";
    const erro = new ApiError(mensagem);
    if (corpo && typeof corpo === "object" && "codigo" in corpo) {
      erro.codigo = String((corpo as { codigo: unknown }).codigo);
    }
    throw erro;
  }

  return corpo as T;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
}

export type PlanoTipo = "GRATUITO" | "START" | "BUSINESS" | "PRO";

export interface Empresa {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  descricao: string | null;
  logoUrl: string | null;
  corPrimaria: string | null;
  corSecundaria: string | null;
  onboardingConcluido: boolean;
  onboardingPasso: number;
  planoTipo: PlanoTipo;
  cicloFaturamento: "MENSAL" | "ANUAL";
  trialBonusAteEm: string | null;
  codigoIndicacao: string;
  paginaPublicaAtiva: boolean;
  slugPublico: string | null;
  exibirPrecosPublico: boolean;
}

export interface EmpresaInput {
  nome?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  endereco?: string;
  descricao?: string;
  logoUrl?: string;
  corPrimaria?: string;
  corSecundaria?: string;
  onboardingConcluido?: boolean;
  onboardingPasso?: number;
  paginaPublicaAtiva?: boolean;
  slugPublico?: string;
  exibirPrecosPublico?: boolean;
}

export const empresaApi = {
  obter: () => apiFetch<Empresa>("/empresa"),

  atualizar: (dados: EmpresaInput) =>
    apiFetch<Empresa>("/empresa", { method: "PATCH", body: JSON.stringify(dados) }),
};

export interface RespostaAutenticacao {
  token: string;
  usuario: Usuario;
  empresa: Empresa;
}

export const authApi = {
  login: (email: string, senha: string) =>
    apiFetch<RespostaAutenticacao>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    }),

  registrar: (
    nomeEmpresa: string,
    nomeUsuario: string,
    email: string,
    senha: string,
    codigoIndicacao?: string
  ) =>
    apiFetch<RespostaAutenticacao>("/auth/registrar", {
      method: "POST",
      body: JSON.stringify({ nomeEmpresa, nomeUsuario, email, senha, codigoIndicacao }),
    }),

  me: () => apiFetch<{ usuario: Usuario; empresa: Empresa }>("/auth/me"),
};

export type StatusOrcamento = "RASCUNHO" | "ENVIADO" | "APROVADO" | "RECUSADO";

export interface AtividadeRecente {
  id: string;
  numero: number;
  status: StatusOrcamento;
  total: string;
  atualizadoEm: string;
  cliente: { id: string; nome: string };
}

export interface ResumoOrcamentos {
  totalOrcamentos: number;
  pendentes: number;
  aprovados: number;
  valorTotal: string;
  atividadesRecentes: AtividadeRecente[];
}

export interface ValorCampoInput {
  campoId: string;
  valor: string | string[];
}

export interface ItemOrcamentoInput {
  produtoId: string;
  quantidade: number;
  precoUnitario?: number;
  valoresCampos?: ValorCampoInput[];
}

export interface DetalheItem {
  nome: string;
  valor: string;
}

export interface OrcamentoInput {
  clienteId: string;
  validade?: string;
  observacoes?: string;
  desconto?: number;
  itens: ItemOrcamentoInput[];
}

export interface ItemOrcamentoDetalhe {
  id: string;
  produtoId: string;
  nome: string;
  quantidade: string;
  precoUnitario: string;
  subtotal: string;
  detalhes: DetalheItem[] | null;
}

export interface OrcamentoDetalhe {
  id: string;
  numero: number;
  data: string;
  validade: string | null;
  observacoes: string | null;
  desconto: string;
  subtotal: string;
  total: string;
  status: StatusOrcamento;
  criadoEm: string;
  atualizadoEm: string;
  clienteId: string;
  cliente: Cliente;
  itens: ItemOrcamentoDetalhe[];
}

export interface ItemOrcamentoPublico {
  nome: string;
  quantidade: string;
  precoUnitario: string;
  subtotal: string;
  detalhes: DetalheItem[] | null;
}

export interface OrcamentoPublico {
  numero: number;
  data: string;
  validade: string | null;
  observacoes: string | null;
  subtotal: string;
  desconto: string;
  total: string;
  status: StatusOrcamento;
  empresa: { nome: string; logoUrl: string | null; corPrimaria: string | null };
  cliente: { nome: string };
  itens: ItemOrcamentoPublico[];
}

export interface OrcamentoResumoItem {
  id: string;
  numero: number;
  data: string;
  validade: string | null;
  desconto: string;
  subtotal: string;
  total: string;
  status: StatusOrcamento;
  criadoEm: string;
  atualizadoEm: string;
  clienteId: string;
  cliente: { id: string; nome: string };
  _count: { itens: number };
}

export const orcamentosApi = {
  resumo: () => apiFetch<ResumoOrcamentos>("/orcamentos/resumo"),

  listar: (status?: StatusOrcamento) =>
    apiFetch<OrcamentoResumoItem[]>(`/orcamentos${status ? `?status=${status}` : ""}`),

  criar: (dados: OrcamentoInput) =>
    apiFetch<OrcamentoDetalhe>("/orcamentos", { method: "POST", body: JSON.stringify(dados) }),

  obter: (id: string) => apiFetch<OrcamentoDetalhe>(`/orcamentos/${id}`),

  atualizarStatus: (id: string, status: StatusOrcamento) =>
    apiFetch<OrcamentoDetalhe>(`/orcamentos/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  obterPublico: (id: string) => apiFetch<OrcamentoPublico>(`/orcamentos-publico/${id}`),
};

export interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ClienteInput {
  nome: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  observacoes?: string;
}

export const clientesApi = {
  listar: () => apiFetch<Cliente[]>("/clientes"),

  criar: (dados: ClienteInput) =>
    apiFetch<Cliente>("/clientes", { method: "POST", body: JSON.stringify(dados) }),

  atualizar: (id: string, dados: Partial<ClienteInput>) =>
    apiFetch<Cliente>(`/clientes/${id}`, { method: "PATCH", body: JSON.stringify(dados) }),

  excluir: (id: string) => apiFetch<null>(`/clientes/${id}`, { method: "DELETE" }),
};

export type TipoCampo = "TEXTO" | "NUMERO" | "SELECAO_UNICA" | "SELECAO_MULTIPLA";

export interface OpcaoCampoProduto {
  id: string;
  rotulo: string;
}

export interface CampoProduto {
  id: string;
  nome: string;
  tipo: TipoCampo;
  unidade: string | null;
  obrigatorio: boolean;
  opcoes: OpcaoCampoProduto[];
}

export interface OpcaoCampoInput {
  rotulo: string;
}

export interface CampoInput {
  nome: string;
  tipo: TipoCampo;
  unidade?: string;
  obrigatorio?: boolean;
  opcoes?: OpcaoCampoInput[];
}

export type TipoProduto = "SIMPLES" | "KIT";

export interface ItemKit {
  id: string;
  componenteProdutoId: string;
  quantidade: number;
  componenteProduto: { id: string; nome: string; sku: string | null; preco?: string };
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco: string;
  unidade: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  campos: CampoProduto[];
  tipoProduto: TipoProduto;
  controlaEstoque: boolean;
  estoqueMinimo: number | null;
  sku: string | null;
  exibirNaPaginaPublica: boolean;
  imagemUrl: string | null;
  itensDoKit: ItemKit[];
}

export interface ProdutoInput {
  nome: string;
  descricao?: string;
  preco: number;
  unidade?: string;
  ativo?: boolean;
  tipoProduto?: TipoProduto;
  controlaEstoque?: boolean;
  estoqueMinimo?: number;
  sku?: string;
  exibirNaPaginaPublica?: boolean;
  imagemUrl?: string;
}

export const produtosApi = {
  listar: (filtroAtivo?: boolean) =>
    apiFetch<Produto[]>(`/produtos${filtroAtivo === undefined ? "" : `?ativo=${filtroAtivo}`}`),

  criar: (dados: ProdutoInput) =>
    apiFetch<Produto>("/produtos", { method: "POST", body: JSON.stringify(dados) }),

  atualizar: (id: string, dados: Partial<ProdutoInput>) =>
    apiFetch<Produto>(`/produtos/${id}`, { method: "PATCH", body: JSON.stringify(dados) }),

  atualizarCampos: (id: string, campos: CampoInput[]) =>
    apiFetch<Produto>(`/produtos/${id}/campos`, { method: "PUT", body: JSON.stringify({ campos }) }),

  atualizarKit: (id: string, itens: { componenteProdutoId: string; quantidade: number }[]) =>
    apiFetch<Produto>(`/produtos/${id}/kit`, { method: "PUT", body: JSON.stringify({ itens }) }),

  excluir: (id: string) => apiFetch<null>(`/produtos/${id}`, { method: "DELETE" }),
};

// --- Estoque -----------------------------------------------------------

export type TipoLocalEstoque = "LOJA" | "DEPOSITO" | "OFICINA" | "OUTRO";
export type TipoMovimentacaoEstoque = "ENTRADA" | "SAIDA" | "AJUSTE" | "TRANSFERENCIA";
export type StatusEstoqueCalculado = "SEM_ESTOQUE" | "BAIXO" | "NORMAL" | "NAO_CONTROLADO";

export interface LocalEstoque {
  id: string;
  nome: string;
  tipo: TipoLocalEstoque;
  ativo: boolean;
}

export interface ItemEstoque {
  produtoId: string;
  nome: string;
  sku: string | null;
  tipoProduto: TipoProduto;
  estoqueMinimo: number | null;
  totalDisponivel: number;
  totalQuarentena: number;
  status: StatusEstoqueCalculado;
  porLocal: { localId: string; localNome: string; quantidade: number; quantidadeQuarentena: number }[];
  variacoes: unknown[];
}

export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  localId: string;
  localOrigemId: string | null;
  tipo: TipoMovimentacaoEstoque | string;
  quantidade: number;
  saldoResultante: number;
  motivo: string | null;
  criadoEm: string;
}

export interface MovimentarEstoqueInput {
  produtoId: string;
  variacaoId?: string;
  localId: string;
  localOrigemId?: string;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  motivo?: string;
}

export const estoqueApi = {
  listarLocais: () => apiFetch<LocalEstoque[]>("/estoque/locais"),
  criarLocal: (dados: { nome: string; tipo?: TipoLocalEstoque }) =>
    apiFetch<LocalEstoque>("/estoque/locais", { method: "POST", body: JSON.stringify(dados) }),

  listar: () => apiFetch<ItemEstoque[]>("/estoque"),

  movimentacoesDoProduto: (produtoId: string) =>
    apiFetch<MovimentacaoEstoque[]>(`/estoque/produtos/${produtoId}/movimentacoes`),

  movimentar: (dados: MovimentarEstoqueInput) =>
    apiFetch<MovimentacaoEstoque>("/estoque/movimentar", { method: "POST", body: JSON.stringify(dados) }),
};

// --- Vendas --------------------------------------------------------------

export type StatusVenda = "CONFIRMADA" | "CANCELADA";
export type OrigemVenda = "MOVA" | "WHATSAPP" | "MERCADO_LIVRE" | "SITE_PROPRIO" | "OUTRO";

export interface ItemVenda {
  id: string;
  produtoId: string;
  nome: string;
  quantidade: string;
  precoUnitario: string;
  subtotal: string;
}

export interface Venda {
  id: string;
  numero: number;
  status: StatusVenda;
  origem: OrigemVenda;
  subtotal: string;
  desconto: string;
  total: string;
  criadoEm: string;
  cliente: { id: string; nome: string } | null;
  itens?: ItemVenda[];
  _count?: { itens: number };
}

export interface VendaInput {
  clienteId?: string;
  origem?: OrigemVenda;
  desconto?: number;
  itens: { produtoId: string; variacaoId?: string; quantidade: number }[];
}

export const vendasApi = {
  listar: () => apiFetch<Venda[]>("/vendas"),
  obter: (id: string) => apiFetch<Venda>(`/vendas/${id}`),
  criar: (dados: VendaInput) => apiFetch<Venda>("/vendas", { method: "POST", body: JSON.stringify(dados) }),
  cancelar: (id: string) => apiFetch<Venda>(`/vendas/${id}/cancelar`, { method: "POST" }),
  criarAPartirDeOrcamento: (orcamentoId: string) =>
    apiFetch<Venda>(`/vendas/a-partir-de-orcamento/${orcamentoId}`, { method: "POST" }),
};

// --- Pedidos --------------------------------------------------------------

export type StatusPedido = "RECEBIDO" | "PROCESSANDO" | "CONFIRMADO" | "CANCELADO";
export type CanalPedido = "WHATSAPP" | "MERCADO_LIVRE" | "SITE_PROPRIO" | "MANUAL";

export interface Pedido {
  id: string;
  numero: number;
  canal: CanalPedido;
  status: StatusPedido;
  total: string;
  referenciaExterna: string | null;
  itens: { nome: string; quantidade: number; precoUnitario: number }[];
  criadoEm: string;
  cliente: { id: string; nome: string } | null;
}

export interface PedidoInput {
  canal: CanalPedido;
  clienteId?: string;
  referenciaExterna?: string;
  itens: { nome: string; quantidade: number; precoUnitario: number }[];
}

export const pedidosApi = {
  listar: () => apiFetch<Pedido[]>("/pedidos"),
  obter: (id: string) => apiFetch<Pedido>(`/pedidos/${id}`),
  criar: (dados: PedidoInput) => apiFetch<Pedido>("/pedidos", { method: "POST", body: JSON.stringify(dados) }),
  atualizarStatus: (id: string, status: StatusPedido) =>
    apiFetch<Pedido>(`/pedidos/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

// --- Devoluções ------------------------------------------------------------

export type StatusDevolucao =
  | "IDENTIFICADA"
  | "AGUARDANDO_RECEBIMENTO"
  | "RECEBIDA"
  | "EM_CONFERENCIA"
  | "APROVADA"
  | "REPROVADA"
  | "SINCRONIZACAO_PENDENTE"
  | "SINCRONIZADA"
  | "ERRO_SINCRONIZACAO";

export type ResultadoConferencia = "INTEGRO" | "AVARIA" | "INCOMPLETO" | "DIVERGENTE";

export interface ItemDevolucao {
  id: string;
  produtoId: string;
  variacaoId: string | null;
  quantidade: number;
  resultadoConferencia: ResultadoConferencia | null;
  liberadoEm: string | null;
  produto?: { id: string; nome: string; sku: string | null };
}

export interface Devolucao {
  id: string;
  origem: "MERCADO_LIVRE" | "MANUAL";
  status: StatusDevolucao;
  observacoes: string | null;
  criadoEm: string;
  itens: ItemDevolucao[];
  venda: { id: string; numero: number } | null;
  pedido: { id: string; numero: number } | null;
}

export interface DevolucaoInput {
  vendaId?: string;
  pedidoId?: string;
  observacoes?: string;
  itens: { produtoId: string; variacaoId?: string; quantidade: number }[];
}

export const devolucoesApi = {
  listar: () => apiFetch<Devolucao[]>("/devolucoes"),
  obter: (id: string) => apiFetch<Devolucao>(`/devolucoes/${id}`),
  criar: (dados: DevolucaoInput) => apiFetch<Devolucao>("/devolucoes", { method: "POST", body: JSON.stringify(dados) }),
  receber: (id: string) => apiFetch<Devolucao>(`/devolucoes/${id}/receber`, { method: "POST" }),
  conferirItem: (devolucaoId: string, itemId: string, resultado: ResultadoConferencia, observacoes?: string) =>
    apiFetch<Devolucao>(`/devolucoes/${devolucaoId}/itens/${itemId}/conferir`, {
      method: "POST",
      body: JSON.stringify({ resultado, observacoes }),
    }),
};

// --- Integrações (Mercado Livre / WhatsApp) --------------------------------

export interface StatusMercadoLivre {
  configurado: boolean;
  conectado: boolean;
  conta: { mlUserId: string; conectadoEm: string; atualizadoEm: string } | null;
}

export const integracoesApi = {
  statusMercadoLivre: () => apiFetch<StatusMercadoLivre>("/integracoes/mercado-livre/status"),
  conectarMercadoLivre: () => apiFetch<{ url: string }>("/integracoes/mercado-livre/conectar"),
  desconectarMercadoLivre: () => apiFetch<null>("/integracoes/mercado-livre/desconectar", { method: "POST" }),
};

export interface StatusWhatsApp {
  configurado: boolean;
  conta: { numeroTelefone: string | null; conectada: boolean } | null;
}

export interface ConversaWhatsApp {
  id: string;
  contatoTelefone: string;
  ultimaMensagemEm: string;
  cliente: { id: string; nome: string } | null;
}

export interface MensagemWhatsApp {
  id: string;
  direcao: "ENVIADA" | "RECEBIDA";
  conteudo: string;
  criadoEm: string;
}

export const whatsappApi = {
  status: () => apiFetch<StatusWhatsApp>("/whatsapp/status"),
  conectar: (numeroTelefone: string) =>
    apiFetch<StatusWhatsApp["conta"]>("/whatsapp/conectar", { method: "POST", body: JSON.stringify({ numeroTelefone }) }),
  listarConversas: () => apiFetch<ConversaWhatsApp[]>("/whatsapp/conversas"),
  listarMensagens: (conversaId: string) => apiFetch<MensagemWhatsApp[]>(`/whatsapp/conversas/${conversaId}/mensagens`),
  enviarMensagem: (conversaId: string, texto: string) =>
    apiFetch<MensagemWhatsApp>(`/whatsapp/conversas/${conversaId}/mensagens`, {
      method: "POST",
      body: JSON.stringify({ texto }),
    }),
};

// --- IA ---------------------------------------------------------------------

export type CapacidadeIA =
  | "produtos_mais_vendidos"
  | "produtos_estoque_baixo"
  | "comparativo_vendas_3_meses"
  | "clientes_top"
  | "rascunhar_mensagem_cliente"
  | "rascunhar_orcamento";

export const iaApi = {
  capacidades: () => apiFetch<{ configurado: boolean; plano: PlanoTipo; capacidades: CapacidadeIA[] }>("/ia/capacidades"),
  perguntar: (capacidade: CapacidadeIA, extra?: { clienteId?: string; observacoes?: string }) =>
    apiFetch<{ resposta: string }>("/ia/perguntar", { method: "POST", body: JSON.stringify({ capacidade, ...extra }) }),
};

// --- Página pública da empresa ---------------------------------------------

export interface PaginaPublicaEmpresa {
  empresa: {
    nome: string;
    descricao: string | null;
    logoUrl: string | null;
    corPrimaria: string | null;
    corSecundaria: string | null;
    telefone: string | null;
    whatsapp: string | null;
    endereco: string | null;
  };
  exibirPrecos: boolean;
  produtos: { id: string; nome: string; descricao: string | null; imagemUrl: string | null; unidade: string | null; preco?: string }[];
}

export const publicoApi = {
  obterPagina: (slug: string) => apiFetch<PaginaPublicaEmpresa>(`/publico/${slug}`),
};

export interface PlanoConfig {
  planoTipo: PlanoTipo;
  precoMensal: string;
  precoAnual: string;
  limiteClientes: number | null;
  limiteProdutos: number | null;
  limiteOrcamentos: number | null;
  limiteOrcamentosMensal: boolean;
  limiteUsuarios: number | null;
  recursos: {
    estoqueCompleto: boolean;
    iaLimitada: boolean;
    iaCompleta: boolean;
    mercadoLivre: boolean;
    automacoes: boolean;
    relatoriosAvancados: boolean;
  };
}

export const planosApi = {
  listar: () => apiFetch<PlanoConfig[]>("/planos"),
};

export interface DadosIndicacao {
  codigoIndicacao: string;
  trialBonusAteEm: string | null;
  indicacoesValidas: number;
  indicacoesPendentes: number;
  diasGarantidosPeloPrograma: number;
  tetoDiasPrograma: number;
  tetoAtingido: boolean;
  foiIndicadaPor: "PENDENTE" | "VALIDA" | "BLOQUEADA" | null;
}

export const indicacaoApi = {
  minha: () => apiFetch<DadosIndicacao>("/indicacao/minha"),
};

export type StatusAssinatura = "PENDENTE" | "ATIVA" | "PAUSADA" | "CANCELADA" | "EXPIRADA" | "RECUSADA";

export interface Assinatura {
  planoTipo: PlanoTipo;
  cicloFaturamento: "MENSAL" | "ANUAL";
  status: StatusAssinatura;
  iniciadaEm: string | null;
  proximaCobranca: string | null;
  canceladaEm: string | null;
}

export const assinaturasApi = {
  minha: () => apiFetch<Assinatura | null>("/assinaturas/minha"),

  criarCheckout: (planoTipo: Exclude<PlanoTipo, "GRATUITO">, cicloFaturamento: "MENSAL" | "ANUAL") =>
    apiFetch<{ initPoint: string }>("/assinaturas/checkout", {
      method: "POST",
      body: JSON.stringify({ planoTipo, cicloFaturamento }),
    }),

  cancelar: () => apiFetch<null>("/assinaturas/cancelar", { method: "POST" }),
};

