import { api } from './api'

export type TipoAnotacao = 'limitacao' | 'restricao' | 'observacao' | 'recomendacao' | 'complementar'

export interface Anotacao {
  id: string
  tipo: TipoAnotacao
  texto: string
  criadoEm: string
  autorNome?: string
}

export async function listarAnotacoes(pacienteId: string): Promise<Anotacao[]> {
  const { data } = await api.get(`/anotacoes/${pacienteId}`)
  return data.data ?? []
}

export async function criarAnotacao(pacienteId: string, tipo: TipoAnotacao, texto: string): Promise<Anotacao> {
  const { data } = await api.post('/anotacoes', { pacienteId, tipo, texto })
  return data
}
