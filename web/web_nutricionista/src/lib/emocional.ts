import { api } from './api'

export interface RegistroEmocional {
  id: string
  dataHora: string
  estado: string
  rotuloEstado: string
  intensidade: number | null
  /** Texto livre com os fatores separados por vírgula ("noite mal dormida, prova"). */
  fatores: string | null
  observacao: string | null
}

export interface ResumoEmocional {
  periodoDias: number
  total: number
  /** Média na escala de 1 (muito mal) a 5 (muito bem). Não é nota: serve de tendência. */
  mediaEscala: number | null
  porEstado: { estado: string; rotulo: string; total: number }[]
  fatoresFrequentes: { fator: string; vezes: number }[]
}

export async function listarEmocional(
  pacienteId: string,
  dias?: number,
  limite?: number,
): Promise<RegistroEmocional[]> {
  const { data } = await api.get('/emocional', { params: { pacienteId, dias, limite } })
  return data.data
}

export async function buscarResumoEmocional(
  pacienteId: string,
  dias = 30,
): Promise<ResumoEmocional> {
  const { data } = await api.get('/emocional/resumo', { params: { pacienteId, dias } })
  return data
}

/** Cor de cada estado, para as barras do resumo usarem a mesma escala da API. */
export const TINT_ESTADO: Record<string, 'success' | 'primary' | 'warning' | 'danger'> = {
  muito_bem: 'success',
  bem: 'success',
  neutro: 'primary',
  mal: 'warning',
  muito_mal: 'danger',
}
