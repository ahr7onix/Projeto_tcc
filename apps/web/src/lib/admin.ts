import { api } from './api'

export interface MetricasAdmin {
  pacientes: number
  nutricionistas: number
  administradores: number
  vinculos: number
  planos: number
  glicemias30d: number
  refeicoes30d: number
  conteudos: number
  pacientesAtivos7d: number
  nutricionistasSemCrn: number
}

export interface UsuarioAdmin {
  id: string
  nome: string
  email: string
  tipo: 'paciente' | 'nutricionista' | 'administrador'
  criadoEm: string
  crn: string | null
  especialidade: string | null
  perfilCompleto: boolean | null
  /** Só para nutricionista: o acesso ao painel depende da aprovação. */
  aprovado: boolean | null
  vinculos: number
}

export async function obterMetricas(): Promise<MetricasAdmin> {
  const { data } = await api.get('/admin/metricas')
  return data
}

export interface CategoriaAnalise {
  chave: string
  rotulo: string
  total: number
}

export interface AnaliseAdmin {
  periodoDias: number
  perfil: {
    totalPacientes: number
    porTipoDiabetes: CategoriaAnalise[]
    porFaixaEtaria: CategoriaAnalise[]
  }
  controle: {
    totalMedicoes: number
    /** Percentual das leituras dentro do alvo do proprio momento do dia. */
    percentualNaFaixa: number | null
    porClassificacao: {
      classificacao: string
      rotulo: string
      severidade: 'critico' | 'atencao' | 'normal'
      total: number
    }[]
    evolucaoMensal: { mes: string; total: number; percentualNaFaixa: number | null }[]
  }
  acompanhamento: {
    totalPacientes: number
    ativos7d: number
    ativos30d: number
    /** Cadastrados que nao registraram nada no ultimo mes. */
    semRegistro30d: number
    semNutricionista: number
  }
}

/** Analise do grupo atendido, para a associacao. */
export async function obterAnalise(dias = 90): Promise<AnaliseAdmin> {
  const { data } = await api.get('/admin/analise', { params: { dias } })
  return data
}

export async function listarUsuarios(
  params: { tipo?: string; busca?: string; pendentes?: boolean } = {},
): Promise<UsuarioAdmin[]> {
  const { data } = await api.get('/admin/usuarios', { params })
  return data.data
}

/** Libera o painel para um nutricionista, depois de conferir o CRN. */
export async function aprovarNutricionista(id: string): Promise<void> {
  await api.patch(`/admin/nutricionistas/${id}/aprovar`)
}

export interface CadastroNutricionistaPayload {
  nome: string
  email: string
  crn?: string
  especialidade?: string
}

export interface CadastroNutricionistaResultado {
  nutricionista: { id: string; nome: string; email: string; crn: string | null }
  /** Falso quando o servidor não tem e-mail de verdade configurado. */
  emailEnviado: boolean
  /** Só vem fora de produção, para testar sem caixa de e-mail. */
  linkDefinirSenha?: string
}

/** A conta já nasce aprovada; a senha, o nutricionista cria pelo link do e-mail. */
export async function cadastrarNutricionista(
  payload: CadastroNutricionistaPayload,
): Promise<CadastroNutricionistaResultado> {
  const { data } = await api.post('/admin/nutricionistas', payload)
  return data
}

export async function removerUsuario(id: string): Promise<void> {
  await api.delete(`/admin/usuarios/${id}`)
}
