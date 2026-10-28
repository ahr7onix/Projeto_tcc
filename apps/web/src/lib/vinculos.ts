import { api } from './api'

/**
 * O vínculo nasce de um convite que o paciente aceita pelo aplicativo (LGPD):
 * o painel convida e acompanha a resposta, mas não vincula ninguém direto.
 */
export interface ConviteEnviado {
  id: string
  paciente: { id: string; nome: string; email: string }
  criadoEm: string
}

export async function convidarPaciente(email: string): Promise<ConviteEnviado> {
  const { data } = await api.post('/vinculos/convites', { email })
  return data
}

/** Convites que ainda esperam a resposta do paciente. */
export async function listarConvites(): Promise<ConviteEnviado[]> {
  const { data } = await api.get('/vinculos/convites')
  return data.data
}

export async function cancelarConvite(id: string): Promise<void> {
  await api.delete(`/vinculos/convites/${id}`)
}

export async function desvincularPaciente(pacienteId: string): Promise<void> {
  await api.delete(`/vinculos/${pacienteId}`)
}
