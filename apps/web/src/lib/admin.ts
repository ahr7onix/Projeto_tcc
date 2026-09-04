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
  perfilCompleto: boolean | null
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

export async function listarUsuarios(params: { tipo?: string; busca?: string } = {}): Promise<UsuarioAdmin[]> {
  const { data } = await api.get('/admin/usuarios', { params })
  return data.data
}

export async function removerUsuario(id: string): Promise<void> {
  await api.delete(`/admin/usuarios/${id}`)
}
