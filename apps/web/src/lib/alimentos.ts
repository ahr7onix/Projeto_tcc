import { api } from './api'

export interface Alimento {
  id: string
  nome: string
  grupo: string
  medidaCaseira: string | null
  medidaCaseiraG: number | null
  porcaoG: number
  kcal: number
  carboidratosG: number
  proteinasG: number
  lipidiosG: number
  fibrasG: number | null
  indiceGlicemico: number | null
  fonte: string
  ativo: boolean
}

export interface GrupoAlimento {
  grupo: string
  total: number
}

export interface AlimentoPayload {
  nome: string
  grupo?: string
  medidaCaseira?: string
  medidaCaseiraG?: number
  porcaoG?: number
  kcal: number
  carboidratosG: number
  proteinasG: number
  lipidiosG: number
  fibrasG?: number
  indiceGlicemico?: number
  fonte?: string
}

export interface FiltroAlimentos {
  busca?: string
  grupo?: string
  limite?: number
}

export async function listarAlimentos(filtro: FiltroAlimentos = {}): Promise<Alimento[]> {
  const { data } = await api.get('/alimentos', {
    params: {
      busca: filtro.busca || undefined,
      grupo: filtro.grupo || undefined,
      limite: filtro.limite,
    },
  })
  return data.data
}

export async function listarGrupos(): Promise<GrupoAlimento[]> {
  const { data } = await api.get('/alimentos/grupos')
  return data.data
}

export async function criarAlimento(payload: AlimentoPayload): Promise<Alimento> {
  const { data } = await api.post('/alimentos', payload)
  return data
}

export async function atualizarAlimento(
  id: string,
  payload: AlimentoPayload,
): Promise<Alimento> {
  const { data } = await api.patch(`/alimentos/${id}`, payload)
  return data
}

/** O alimento não é apagado: fica inativo, porque planos antigos apontam para ele. */
export async function desativarAlimento(id: string): Promise<void> {
  await api.delete(`/alimentos/${id}`)
}

/** Rótulo curto do alimento na lista: "100 g" ou "1 colher (25 g)". */
export function descreverPorcao(alimento: Alimento): string {
  if (alimento.medidaCaseira && alimento.medidaCaseiraG) {
    return `${alimento.medidaCaseira} (${alimento.medidaCaseiraG} g)`
  }
  return `${alimento.porcaoG} g`
}
