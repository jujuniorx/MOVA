const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const CHAVE_TOKEN = "orcafacil_token";

export class ApiError extends Error {}

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
    throw new ApiError(mensagem);
  }

  return corpo as T;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
}

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

  registrar: (nomeEmpresa: string, nomeUsuario: string, email: string, senha: string) =>
    apiFetch<RespostaAutenticacao>("/auth/registrar", {
      method: "POST",
      body: JSON.stringify({ nomeEmpresa, nomeUsuario, email, senha }),
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
}

export interface ProdutoInput {
  nome: string;
  descricao?: string;
  preco: number;
  unidade?: string;
  ativo?: boolean;
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

  excluir: (id: string) => apiFetch<null>(`/produtos/${id}`, { method: "DELETE" }),
};

