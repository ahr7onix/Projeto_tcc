import { api } from './api'

export interface PacienteDisponivel {
  id: string
  nome: string
  email: string
}

export async function buscarDisponiveis(busca?: string): Promise<PacienteDisponivel[]> {
  const { data } = await api.get('/pacientes/disponiveis', {
    params: busca ? { busca } : undefined,
  })
  return data.data
}

export async function vincularPaciente(pacienteId: string): Promise<void> {
  await api.post('/vinculos', { pacienteId })
}

export async function desvincularPaciente(pacienteId: string): Promise<void> {
  await api.delete(`/vinculos/${pacienteId}`)
}
