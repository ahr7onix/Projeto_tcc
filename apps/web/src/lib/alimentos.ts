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

export interface PaginaAlimentos {
  itens: Alimento[]
  /** Quantos alimentos a busca achou, somando todas as páginas. */
  total: number
}

export async function listarPaginaAlimentos(
  filtro: FiltroAlimentos & { pagina: number },
): Promise<PaginaAlimentos> {
  const { data } = await api.get('/alimentos', {
    params: {
      busca: filtro.busca || undefined,
      grupo: filtro.grupo || undefined,
      limite: filtro.limite,
      pagina: filtro.pagina,
    },
  })
  return { itens: data.data, total: data.total ?? data.data.length }
}

/**
 * A tabela inteira, para quem precisa de todos de uma vez. A API entrega no
 * máximo 500 por pedido e a TACO tem 578: com `limite: 300` o seletor do plano
 * parava no meio do alfabeto e o resto da tabela não aparecia para escolher.
 */
export async function listarCatalogoAlimentos(): Promise<Alimento[]> {
  const POR_PEDIDO = 500
  const primeira = await listarPaginaAlimentos({ limite: POR_PEDIDO, pagina: 1 })
  const itens = [...primeira.itens]
  for (let pagina = 2; itens.length < primeira.total; pagina += 1) {
    const proxima = await listarPaginaAlimentos({ limite: POR_PEDIDO, pagina })
    if (proxima.itens.length === 0) break
    itens.push(...proxima.itens)
  }
  return itens
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

/** Uma linha da planilha já convertida; a fonte vale para a planilha inteira. */
export type ItemImportacao = Omit<AlimentoPayload, 'fonte'>

export interface ResultadoImportacao {
  fonte: string
  inseridos: number
  atualizados: number
  /** `indice` é a posição do item na lista enviada naquele lote. */
  recusados: { indice: number; nome: string | null; motivo: string }[]
}

export async function importarAlimentos(
  fonte: string,
  itens: ItemImportacao[],
): Promise<ResultadoImportacao> {
  const { data } = await api.post('/alimentos/importar', { fonte, itens })
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
