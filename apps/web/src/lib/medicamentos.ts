import { api } from './api'

export interface Medicamento {
  id: string
  nome: string
  dosagem: string
  frequencia: string
  horarioInicial: string
  ativo: boolean
  observacoes: string | null
  criadoEm: string
}

export interface MedicamentoPayload {
  pacienteId: string
  nome: string
  dosagem: string
  frequencia: string
  horarioInicial: string
  /** `null` apaga a observação; ausente mantém a que está gravada. */
  observacoes?: string | null
}

export async function listarMedicamentos(
  pacienteId: string,
  incluirInativos = false,
): Promise<Medicamento[]> {
  const { data } = await api.get('/medicamentos', {
    params: { pacienteId, incluirInativos: incluirInativos ? true : undefined },
  })
  return data.data
}

export async function criarMedicamento(
  payload: MedicamentoPayload,
): Promise<Medicamento> {
  const { data } = await api.post('/medicamentos', payload)
  return data
}

export async function atualizarMedicamento(
  id: string,
  pacienteId: string,
  payload: Partial<Omit<MedicamentoPayload, 'pacienteId'>>,
): Promise<Medicamento> {
  const { data } = await api.patch(`/medicamentos/${id}`, payload, {
    params: { pacienteId },
  })
  return data
}

/** Medicamento não é apagado: fica suspenso, para o histórico não sumir. */
export async function suspenderMedicamento(
  id: string,
  pacienteId: string,
): Promise<void> {
  await api.delete(`/medicamentos/${id}`, { params: { pacienteId } })
}
