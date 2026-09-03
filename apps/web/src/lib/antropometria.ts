import { api } from './api'

export interface RegistroAntropometrico {
  id: string
  dataMedicao: string
  peso: number | null
  altura: number | null
  imc: number | null
  classificacaoImc: string | null
  rotuloImc: string | null
  circCintura: number | null
  circQuadril: number | null
  circBraco: number | null
  circPanturrilha: number | null
  circPescoco: number | null
  rcq: number | null
  riscoRcq: string | null
  riscoCintura: string | null
  observacao: string | null
  autorNome: string | null
  criadoEm: string
}

export interface PontoSerie {
  data: string
  valor: number
}

export interface EvolucaoAntropometrica {
  peso: PontoSerie[]
  imc: PontoSerie[]
  circCintura: PontoSerie[]
  /** Diferença entre a primeira e a última pesagem; null com menos de duas medidas. */
  variacaoPeso: number | null
}

export interface AntropometriaPayload {
  pacienteId: string
  dataMedicao?: string
  peso?: number
  altura?: number
  circCintura?: number
  circQuadril?: number
  circBraco?: number
  circPanturrilha?: number
  circPescoco?: number
  observacao?: string
}

export async function listarAntropometria(
  pacienteId: string,
  limite?: number,
): Promise<RegistroAntropometrico[]> {
  const { data } = await api.get('/antropometria', { params: { pacienteId, limite } })
  return data.data
}

export async function buscarEvolucao(pacienteId: string): Promise<EvolucaoAntropometrica> {
  const { data } = await api.get('/antropometria/evolucao', { params: { pacienteId } })
  return data
}

export async function criarAntropometria(
  payload: AntropometriaPayload,
): Promise<RegistroAntropometrico> {
  const { data } = await api.post('/antropometria', payload)
  return data
}

export async function excluirAntropometria(
  id: string,
  pacienteId: string,
): Promise<void> {
  await api.delete(`/antropometria/${id}`, { params: { pacienteId } })
}

const ROTULO_RISCO: Record<string, string> = {
  baixo: 'Risco baixo',
  moderado: 'Risco moderado',
  aumentado: 'Risco aumentado',
  muito_aumentado: 'Risco muito aumentado',
  elevado: 'Risco elevado',
}

export const rotuloRisco = (risco: string | null): string | null =>
  risco === null ? null : (ROTULO_RISCO[risco] ?? risco)
