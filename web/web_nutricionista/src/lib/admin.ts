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

export async function listarUsuarios(params: { tipo?: string; busca?: string } = {}): Promise<UsuarioAdmin[]> {
  const { data } = await api.get('/admin/usuarios', { params })
  return data.data
}

export async function removerUsuario(id: string): Promise<void> {
  await api.delete(`/admin/usuarios/${id}`)
}
