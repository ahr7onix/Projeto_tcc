import { api } from './api'

export interface Receita {
  id: string
  titulo: string
  resumo: string | null
  ingredientes: string
  modoPreparo: string
  porcoes: number | null
  tempoPreparoMin: number | null
  kcalPorcao: number | null
  carboidratosPorcao: number | null
  proteinasPorcao: number | null
  lipidiosPorcao: number | null
  categoria: string
  publicado: boolean
  autorId: string
  autorNome: string
  criadoEm: string
  atualizadoEm: string
}

export interface CategoriaReceita {
  categoria: string
  total: number
}

export interface ReceitaPayload {
  titulo: string
  resumo?: string
  ingredientes: string
  modoPreparo: string
  porcoes?: number
  tempoPreparoMin?: number
  kcalPorcao?: number
  carboidratosPorcao?: number
  proteinasPorcao?: number
  lipidiosPorcao?: number
  categoria?: string
  publicado?: boolean
}

export interface FiltroReceitas {
  busca?: string
  categoria?: string
  apenasMinhas?: boolean
  limite?: number
}

export async function listarReceitas(filtro: FiltroReceitas = {}): Promise<Receita[]> {
  const { data } = await api.get('/receitas', {
    params: {
      busca: filtro.busca || undefined,
      categoria: filtro.categoria || undefined,
      apenasMinhas: filtro.apenasMinhas ? true : undefined,
      limite: filtro.limite,
    },
  })
  return data.data
}

export async function listarCategorias(): Promise<CategoriaReceita[]> {
  const { data } = await api.get('/receitas/categorias')
  return data.data
}

export async function buscarReceita(id: string): Promise<Receita> {
  const { data } = await api.get(`/receitas/${id}`)
  return data
}

export async function criarReceita(payload: ReceitaPayload): Promise<Receita> {
  const { data } = await api.post('/receitas', payload)
  return data
}

export async function atualizarReceita(
  id: string,
  payload: ReceitaPayload,
): Promise<Receita> {
  const { data } = await api.patch(`/receitas/${id}`, payload)
  return data
}

export async function excluirReceita(id: string): Promise<void> {
  await api.delete(`/receitas/${id}`)
}

/** Os ingredientes são um texto livre com uma linha por item. */
export const linhasDeIngredientes = (texto: string): string[] =>
  texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)
