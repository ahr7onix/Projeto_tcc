import { api } from './api'

export interface Conteudo {
  id: string
  titulo: string
  resumo: string | null
  categoria: string
  publicado: boolean
  publico: 'todos' | 'pacientes_diabetes' | 'adultos'
  agendadoEm: string | null
  imagemCapa: string | null
  autorNome: string | null
  criadoEm: string
  atualizadoEm: string
  conteudo?: string
}

export interface ConteudoPayload {
  titulo: string
  resumo?: string
  conteudo: string
  categoria?: string
  publicado?: boolean
  publico?: 'todos' | 'pacientes_diabetes' | 'adultos'
  agendadoEm?: string
  imagemCapa?: string
}

export async function listarConteudos(todos = true): Promise<Conteudo[]> {
  const { data } = await api.get('/conteudos', { params: { todos } })
  return data.data
}

export async function buscarConteudo(id: string): Promise<Conteudo> {
  const { data } = await api.get(`/conteudos/${id}`)
  return data
}

export async function criarConteudo(payload: ConteudoPayload): Promise<Conteudo> {
  const { data } = await api.post('/conteudos', payload)
  return data
}

export async function atualizarConteudo(
  id: string,
  payload: Partial<ConteudoPayload>,
): Promise<Conteudo> {
  const { data } = await api.patch(`/conteudos/${id}`, payload)
  return data
}

export async function removerConteudo(id: string): Promise<void> {
  await api.delete(`/conteudos/${id}`)
}
