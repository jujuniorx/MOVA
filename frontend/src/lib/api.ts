const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const CHAVE_TOKEN = "mova_token";
const CHAVE_TOKEN_ANTIGA = "orcafacil_token";

export class ApiError extends Error {
  codigo?: string;
}

/** Migra sessões salvas com a chave antiga (nome do produto anterior ao MOVA) para a atual, sem deslogar quem já estava autenticado. */
function migrarTokenAntigo() {
  const tokenAntigo = localStorage.getItem(CHAVE_TOKEN_ANTIGA);
  if (tokenAntigo && !localStorage.getItem(CHAVE_TOKEN)) {
    localStorage.setItem(CHAVE_TOKEN, tokenAntigo);
  }
  localStorage.removeItem(CHAVE_TOKEN_ANTIGA);
}

export function obterToken(): string | null {
  migrarTokenAntigo();
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

// --- Cliente administrativo (separado do cliente de usuário comum) --------
//
// Chave de localStorage própria — uma sessão de empresa e uma sessão
// administrativa podem coexistir no mesmo navegador sem se misturar. Nunca
// reutiliza `obterToken`/`salvarToken` acima.
const CHAVE_TOKEN_ADMIN = "mova_admin_token";

export function obterTokenAdmin(): string | null {
  return localStorage.getItem(CHAVE_TOKEN_ADMIN);
}

export function salvarTokenAdmin(token: string) {
  localStorage.setItem(CHAVE_TOKEN_ADMIN, token);
}

export function limparTokenAdmin() {
  localStorage.removeItem(CHAVE_TOKEN_ADMIN);
}

async function apiFetchAdmin<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const token = obterTokenAdmin();

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
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
  }

  const corpo = resposta.status === 204 ? null : await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const mensagem =
      corpo && typeof corpo === "object" && "erro" in corpo
        ? String((corpo as { erro: unknown }).erro)
        : "Não foi possível concluir a operação. Tente novamente.";
    throw new ApiError(mensagem);
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
  memoriaIA: MemoriaIA | null;
}

export interface MemoriaIA {
  tomComunicacao?: "formal" | "neutro" | "descontraido";
  descontoMaximoPercentual?: number;
  margemMinimaPercentual?: number;
  regrasLivres?: string;
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
  memoriaIA?: MemoriaIA;
}

export type ContextoProcesso = "ORCAMENTO";

export interface EtapaProcesso {
  id: string;
  nome: string;
  ordem: number;
  cor: string | null;
  statusBase: StatusOrcamento;
}

export interface ProcessoConfig {
  id: string;
  contexto: ContextoProcesso;
  nome: string;
  etapas: EtapaProcesso[];
}

export interface EtapaProcessoInput {
  nome: string;
  cor?: string;
  statusBase: StatusOrcamento;
}

export interface ProcessoConfigInput {
  nome: string;
  etapas: EtapaProcessoInput[];
}

export const empresaApi = {
  obter: () => apiFetch<Empresa>("/empresa"),

  atualizar: (dados: EmpresaInput) =>
    apiFetch<Empresa>("/empresa", { method: "PATCH", body: JSON.stringify(dados) }),

  // Processo configurável (Etapa 2) — null quando a empresa ainda não
  // configurou nada; o app continua funcionando normalmente nesse caso.
  obterProcesso: (contexto: ContextoProcesso) =>
    apiFetch<ProcessoConfig | null>(`/empresa/processos/${contexto}`),

  atualizarProcesso: (contexto: ContextoProcesso, dados: ProcessoConfigInput) =>
    apiFetch<ProcessoConfig>(`/empresa/processos/${contexto}`, {
      method: "PUT",
      body: JSON.stringify(dados),
    }),

  // Módulos opcionais (Etapa 5 — "cada empresa vê o que precisa").
  obterModulos: () => apiFetch<{ modulos: ModuloInfo[] }>("/empresa/modulos"),

  alterarModulo: (moduloId: string, ativo: boolean) =>
    apiFetch<void>("/empresa/modulos", { method: "PATCH", body: JSON.stringify({ moduloId, ativo }) }),
};

export interface ModuloInfo {
  id: string;
  nome: string;
  descricao: string;
  dependeDe: string[];
  sempreAtivo: boolean;
  implementado: boolean;
  ativo: boolean;
}

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

  esqueciSenha: (email: string) =>
    apiFetch<{ mensagem: string }>("/auth/esqueci-senha", { method: "POST", body: JSON.stringify({ email }) }),

  redefinirSenha: (token: string, novaSenha: string) =>
    apiFetch<{ mensagem: string }>("/auth/redefinir-senha", {
      method: "POST",
      body: JSON.stringify({ token, novaSenha }),
    }),
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
  variacaoId?: string;
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
  variacaoId: string | null;
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
  respondidoPeloClienteEm: string | null;
  motivoRecusa: string | null;
  clienteId: string;
  cliente: Cliente;
  itens: ItemOrcamentoDetalhe[];
  etapaProcessoId: string | null;
  etapaProcesso: EtapaProcesso | null;
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
  respondidoPeloClienteEm: string | null;
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
  etapaProcesso: EtapaProcesso | null;
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

  // Etapa do processo configurável (Etapa 2) — camada de rótulo opcional,
  // etapaProcessoId null limpa a etapa aplicada.
  atualizarEtapa: (id: string, etapaProcessoId: string | null) =>
    apiFetch<OrcamentoDetalhe>(`/orcamentos/${id}/etapa`, {
      method: "PATCH",
      body: JSON.stringify({ etapaProcessoId }),
    }),

  obterPublico: (id: string) => apiFetch<OrcamentoPublico>(`/orcamentos-publico/${id}`),

  aprovarPublico: (id: string) =>
    apiFetch<{ status: StatusOrcamento }>(`/orcamentos-publico/${id}/aprovar`, { method: "POST" }),

  recusarPublico: (id: string, motivo?: string) =>
    apiFetch<{ status: StatusOrcamento }>(`/orcamentos-publico/${id}/recusar`, {
      method: "POST",
      body: JSON.stringify({ motivo }),
    }),
};

// Respostas às informações extras configuradas em CampoCliente, chaveadas
// pelo id do campo — mesmo formato livre gravado no banco.
export type ValoresCamposCliente = Record<string, string | string[] | boolean | undefined>;

export interface EventoHistorico {
  id: string;
  tipo: string;
  entidadeTipo: string;
  entidadeId: string | null;
  descricao: string;
  criadoEm: string;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
  camposPersonalizados: ValoresCamposCliente | null;
}

export interface ClienteInput {
  nome: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  observacoes?: string;
  camposPersonalizados?: ValoresCamposCliente;
}

// --- Importação inteligente (CSV) -----------------------------------------
// Mesmo formato de resposta para clientes e produtos — só os campos
// importáveis mudam por entidade.
export interface CampoImportavel {
  campo: string;
  rotulo: string;
  obrigatorio: boolean;
  sinonimos: string[];
}

export interface PreviewImportacao {
  colunas: string[];
  linhasExemplo: string[][];
  totalLinhas: number;
  campos: CampoImportavel[];
  mapeamentoSugerido: Record<string, number>;
}

export interface ResultadoImportacao {
  criados: number;
  duplicados: number;
  invalidos: { linha: number; motivo: string }[];
  detalheDuplicados: { linha: number; motivo: string }[];
}

export const clientesApi = {
  listar: () => apiFetch<Cliente[]>("/clientes"),

  criar: (dados: ClienteInput) =>
    apiFetch<Cliente>("/clientes", { method: "POST", body: JSON.stringify(dados) }),

  atualizar: (id: string, dados: Partial<ClienteInput>) =>
    apiFetch<Cliente>(`/clientes/${id}`, { method: "PATCH", body: JSON.stringify(dados) }),

  excluir: (id: string) => apiFetch<null>(`/clientes/${id}`, { method: "DELETE" }),

  // Timeline do cliente — reaproveita o histórico central já registrado
  // pelas próprias operações (orçamentos, vendas, pedidos, devoluções).
  historico: (id: string) => apiFetch<EventoHistorico[]>(`/clientes/${id}/historico`),

  // Informações extras que a empresa decide perguntar de todo cliente — por
  // empresa, não por cliente (mesmo padrão de produtosApi.atualizarCampos,
  // mas aqui é um único formulário reaproveitado por todos os clientes).
  listarCampos: () => apiFetch<CampoProduto[]>("/clientes/campos"),

  atualizarCampos: (campos: CampoInput[]) =>
    apiFetch<CampoProduto[]>("/clientes/campos", { method: "PUT", body: JSON.stringify({ campos }) }),

  importarPreview: (arquivoBase64: string) =>
    apiFetch<PreviewImportacao>("/clientes/importar/preview", { method: "POST", body: JSON.stringify({ arquivoBase64 }) }),

  importarConfirmar: (arquivoBase64: string, mapeamento: Record<string, number>, importarDuplicados?: boolean) =>
    apiFetch<ResultadoImportacao>("/clientes/importar/confirmar", {
      method: "POST",
      body: JSON.stringify({ arquivoBase64, mapeamento, importarDuplicados }),
    }),
};

export type TipoCampo = "TEXTO" | "NUMERO" | "SELECAO_UNICA" | "SELECAO_MULTIPLA" | "DATA" | "BOOLEANO";

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

export interface ProdutoVariacao {
  id: string;
  nome: string;
  sku: string | null;
  codigoBarras: string | null;
  precoAdicional: string;
  ativa: boolean;
}

export interface VariacaoInput {
  nome: string;
  sku?: string | null;
  codigoBarras?: string | null;
  precoAdicional?: number;
  ativa?: boolean;
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
  variacoes: ProdutoVariacao[];
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

  atualizarVariacoes: (id: string, variacoes: VariacaoInput[]) =>
    apiFetch<Produto>(`/produtos/${id}/variacoes`, { method: "PUT", body: JSON.stringify({ variacoes }) }),

  excluir: (id: string) => apiFetch<null>(`/produtos/${id}`, { method: "DELETE" }),

  importarPreview: (arquivoBase64: string) =>
    apiFetch<PreviewImportacao>("/produtos/importar/preview", { method: "POST", body: JSON.stringify({ arquivoBase64 }) }),

  importarConfirmar: (arquivoBase64: string, mapeamento: Record<string, number>, importarDuplicados?: boolean) =>
    apiFetch<ResultadoImportacao>("/produtos/importar/confirmar", {
      method: "POST",
      body: JSON.stringify({ arquivoBase64, mapeamento, importarDuplicados }),
    }),
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
  variacoes: { id: string; nome: string; sku: string | null; totalDisponivel: number }[];
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
  variacaoId: string | null;
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
  criarAPartirDePedido: (pedidoId: string) =>
    apiFetch<Venda>(`/vendas/a-partir-de-pedido/${pedidoId}`, { method: "POST" }),
};

// --- Pedidos --------------------------------------------------------------

export type StatusPedido = "RECEBIDO" | "PROCESSANDO" | "CONFIRMADO" | "CANCELADO";
export type CanalPedido = "WHATSAPP" | "MERCADO_LIVRE" | "SITE_PROPRIO" | "MANUAL";

export interface ItemPedido {
  nome: string;
  quantidade: number;
  precoUnitario: number;
  /** Liga este item a um Produto real do catálogo — só quando TODOS os itens têm isso o pedido pode virar venda. */
  produtoId?: string;
  variacaoId?: string;
}

export interface Pedido {
  id: string;
  numero: number;
  canal: CanalPedido;
  status: StatusPedido;
  total: string;
  referenciaExterna: string | null;
  itens: ItemPedido[];
  criadoEm: string;
  cliente: { id: string; nome: string } | null;
  venda: { id: string; numero: number } | null;
}

export interface PedidoInput {
  canal: CanalPedido;
  clienteId?: string;
  referenciaExterna?: string;
  itens: ItemPedido[];
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

export interface NotificacaoMercadoLivre {
  id: string;
  topico: string;
  recursoId: string;
  recebidoEm: string;
  processadoEm: string | null;
  erro: string | null;
}

export const integracoesApi = {
  statusMercadoLivre: () => apiFetch<StatusMercadoLivre>("/integracoes/mercado-livre/status"),
  conectarMercadoLivre: () => apiFetch<{ url: string }>("/integracoes/mercado-livre/conectar"),
  desconectarMercadoLivre: () => apiFetch<null>("/integracoes/mercado-livre/desconectar", { method: "POST" }),

  // Central de problemas operacionais (recorte Mercado Livre).
  notificacoesMercadoLivre: (somenteComErro = false) =>
    apiFetch<NotificacaoMercadoLivre[]>(`/integracoes/mercado-livre/notificacoes${somenteComErro ? "?comErro=true" : ""}`),
  reprocessarNotificacaoMercadoLivre: (id: string) =>
    apiFetch<NotificacaoMercadoLivre>(`/integracoes/mercado-livre/notificacoes/${id}/reprocessar`, { method: "POST" }),
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
  | "rascunhar_orcamento"
  | "sugerir_produtos_segmento"
  | "estruturar_catalogo_texto"
  | "resumo_prioridades"
  | "analise_queda_vendas"
  | "sugerir_followup";

export interface SugestaoSegmentoResposta {
  produtos: string[];
}

export interface CatalogoEstruturadoResposta {
  itens: Array<{
    nome: string;
    confianca?: "alta" | "media" | "baixa";
    variacoes: Array<{ nome: string; preco: number | null }>;
  }>;
}

export type TipoPrioridade = "ORCAMENTO_PARADO" | "CLIENTE_INATIVO" | "ESTOQUE_BAIXO" | "ESTOQUE_ZERADO" | "DEVOLUCAO_PENDENTE" | "INTEGRACAO_COM_ERRO";

export interface ItemPrioridade {
  tipo: TipoPrioridade;
  titulo: string;
  descricao: string;
  entidadeId?: string;
  urgencia: "alta" | "media" | "baixa";
}

export interface EstimativaPreco {
  observado: string;
  informadoPeloUsuario: string | null;
  faixaMinima: number | null;
  faixaMaxima: number | null;
  precoRecomendado: number | null;
  confianca: "alta" | "media" | "baixa";
  justificativa: string;
}

export const iaApi = {
  capacidades: () => apiFetch<{ configurado: boolean; plano: PlanoTipo; capacidades: CapacidadeIA[] }>("/ia/capacidades"),

  // Central "o que precisa da sua atenção?" — determinístico, sem custo de IA.
  prioridades: () => apiFetch<{ itens: ItemPrioridade[] }>("/ia/prioridades"),

  perguntar: (capacidade: CapacidadeIA, extra?: { clienteId?: string; observacoes?: string; orcamentoId?: string }) =>
    apiFetch<{ resposta: string }>("/ia/perguntar", { method: "POST", body: JSON.stringify({ capacidade, ...extra }) }),

  sugerirProdutosPorSegmento: (observacoes: string) =>
    apiFetch<{ dados: SugestaoSegmentoResposta }>("/ia/perguntar", {
      method: "POST",
      body: JSON.stringify({ capacidade: "sugerir_produtos_segmento", observacoes }),
    }),

  estruturarCatalogo: (observacoes: string) =>
    apiFetch<{ dados: CatalogoEstruturadoResposta }>("/ia/perguntar", {
      method: "POST",
      body: JSON.stringify({ capacidade: "estruturar_catalogo_texto", observacoes }),
    }),

  sugerirFollowup: (orcamentoId: string, observacoes?: string) =>
    apiFetch<{ resposta: string }>("/ia/perguntar", {
      method: "POST",
      body: JSON.stringify({ capacidade: "sugerir_followup", orcamentoId, observacoes }),
    }),

  transcreverAudio: (audioBase64: string, tipoMime: string) =>
    apiFetch<{ texto: string }>("/ia/catalogo/transcrever", { method: "POST", body: JSON.stringify({ audioBase64, tipoMime }) }),

  estimarPrecoImagem: (imagemBase64: string, tipoMime: string, descricao?: string) =>
    apiFetch<{ dados: EstimativaPreco }>("/ia/estimar-preco-imagem", {
      method: "POST",
      body: JSON.stringify({ imagemBase64, tipoMime, descricao }),
    }),
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

export interface ProdutoPublicoDetalhe {
  id: string;
  nome: string;
  descricao: string | null;
  imagemUrl: string | null;
  unidade: string | null;
  preco?: string;
  campos: CampoProduto[];
}

export interface SolicitacaoOrcamentoInput {
  clienteNome: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  observacoes?: string;
  itens: { produtoId: string; quantidade: number; valoresCampos?: ValorCampoInput[] }[];
}

export const publicoApi = {
  obterPagina: (slug: string) => apiFetch<PaginaPublicaEmpresa>(`/publico/${slug}`),

  obterProduto: (slug: string, produtoId: string) => apiFetch<ProdutoPublicoDetalhe>(`/publico/${slug}/produtos/${produtoId}`),

  solicitarOrcamento: (slug: string, dados: SolicitacaoOrcamentoInput) =>
    apiFetch<{ numero: number }>(`/publico/${slug}/orcamentos`, { method: "POST", body: JSON.stringify(dados) }),
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

export interface ResultadoBusca {
  tipo: "cliente" | "produto" | "orcamento" | "venda" | "pedido";
  id: string;
  titulo: string;
  subtitulo: string;
  rota: string;
}

export const buscaApi = {
  buscar: (q: string) => apiFetch<{ resultados: ResultadoBusca[] }>(`/busca?q=${encodeURIComponent(q)}`),
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

// --- Painel administrativo ---------------------------------------------

export interface AdminAutenticado {
  id: string;
  nome: string;
  email: string;
}

export interface EmpresaAdmin {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  planoTipo: PlanoTipo;
  cicloFaturamento: "MENSAL" | "ANUAL";
  trialBonusAteEm: string | null;
  suspensa: boolean;
  suspensaEm: string | null;
  suspensaMotivo: string | null;
  criadoEm: string;
  _count: { usuarios: number; clientes: number; produtos: number; orcamentos: number };
}

export type DuracaoAcessoEspecial = "DIAS_15" | "DIAS_30" | "DIAS_90" | "ANO_1" | "VITALICIO";

export interface AcessoEspecialInfo {
  id: string;
  planoTipo: PlanoTipo;
  duracao: DuracaoAcessoEspecial;
  concedidoEm: string;
  expiraEm: string | null;
  motivo: string | null;
  concedidoPorAdmin: { nome: string };
}

export interface EmpresaAdminDetalhe {
  empresa: EmpresaAdmin;
  planoComercial: { planoTipo: PlanoTipo; cicloFaturamento: "MENSAL" | "ANUAL" };
  assinatura: { planoTipo: PlanoTipo; cicloFaturamento: string; status: string; proximaCobranca: string | null; canceladaEm: string | null } | null;
  acessoEspecial: AcessoEspecialInfo | null;
  cobranca: string;
}

export interface LogAuditoriaAdmin {
  id: string;
  acao: string;
  estadoAnterior: unknown;
  estadoNovo: unknown;
  motivo: string | null;
  criadoEm: string;
  admin: { nome: string; email: string };
  empresa?: { nome: string } | null;
}

export interface StatusTecnico {
  totalEmpresas: number;
  empresasSuspensas: number;
  integracoes: {
    mercadoPago: { configurado: boolean };
    mercadoLivre: { configurado: boolean; empresasConectadas: number };
    whatsapp: { configurado: boolean; empresasConectadas: number };
    ia: { configurado: boolean };
    transcricaoAudio: { configurado: boolean };
  };
  erros: { notificacoesMercadoLivreComErro: number };
}

export const adminApi = {
  login: (email: string, senha: string) =>
    apiFetchAdmin<{ token: string; admin: AdminAutenticado }>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    }),

  me: () => apiFetchAdmin<{ admin: AdminAutenticado }>("/admin/auth/me"),

  listarEmpresas: (q?: string, campo?: "nome" | "id" | "email_admin") =>
    apiFetchAdmin<EmpresaAdmin[]>(`/admin/api/empresas${q ? `?q=${encodeURIComponent(q)}&campo=${campo ?? "nome"}` : ""}`),

  obterEmpresa: (id: string) => apiFetchAdmin<EmpresaAdminDetalhe>(`/admin/api/empresas/${id}`),

  suspenderEmpresa: (id: string, motivo: string) =>
    apiFetchAdmin<EmpresaAdmin>(`/admin/api/empresas/${id}/suspender`, { method: "POST", body: JSON.stringify({ motivo }) }),

  reativarEmpresa: (id: string, motivo?: string) =>
    apiFetchAdmin<EmpresaAdmin>(`/admin/api/empresas/${id}/reativar`, { method: "POST", body: JSON.stringify({ motivo }) }),

  concederAcessoEspecial: (id: string, dados: { planoTipo: Exclude<PlanoTipo, "GRATUITO">; duracao: DuracaoAcessoEspecial; motivo?: string }) =>
    apiFetchAdmin<AcessoEspecialInfo>(`/admin/api/empresas/${id}/acesso-especial`, { method: "POST", body: JSON.stringify(dados) }),

  revogarAcessoEspecial: (id: string, motivo?: string) =>
    apiFetchAdmin<null>(`/admin/api/empresas/${id}/acesso-especial/revogar`, { method: "POST", body: JSON.stringify({ motivo }) }),

  auditoriaEmpresa: (id: string) => apiFetchAdmin<LogAuditoriaAdmin[]>(`/admin/api/empresas/${id}/auditoria`),

  auditoriaGlobal: () => apiFetchAdmin<LogAuditoriaAdmin[]>("/admin/api/auditoria"),

  statusTecnico: () => apiFetchAdmin<StatusTecnico>("/admin/api/status-tecnico"),
};

