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

export interface ConviteEnviado {
  conviteId: string
  pacienteId: string
  nome: string
  email: string
  enviadoEm: string
}

/** O vínculo só passa a valer quando o paciente aceita o convite. */
export async function convidarPaciente(pacienteId: string): Promise<void> {
  await api.post('/vinculos', { pacienteId })
}

export async function listarConvitesEnviados(): Promise<ConviteEnviado[]> {
  const { data } = await api.get('/vinculos/convites')
  return data.data
}

export async function cancelarConvite(conviteId: string): Promise<void> {
  await api.delete(`/vinculos/convites/${conviteId}`)
}

export async function desvincularPaciente(pacienteId: string): Promise<void> {
  await api.delete(`/vinculos/${pacienteId}`)
}
