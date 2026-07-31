import { api } from '@/lib/api';

export interface Receita {
  id: string;
  titulo: string;
  resumo: string | null;
  ingredientes: string;
  modoPreparo: string;
  porcoes: number | null;
  tempoPreparoMin: number | null;
  kcalPorcao: number | null;
  carboidratosPorcao: number | null;
  proteinasPorcao: number | null;
  lipidiosPorcao: number | null;
  categoria: string;
  publicado: boolean;
  autorId: string;
  autorNome: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CategoriaReceita {
  categoria: string;
  total: number;
}

export interface FiltroReceitas {
  busca?: string;
  categoria?: string;
  limite?: number;
}

/**
 * O paciente só enxerga receitas publicadas — a API já filtra pelo perfil do
 * token, então o app não precisa mandar nada além da busca.
 */
export async function listarReceitas(filtro: FiltroReceitas = {}): Promise<Receita[]> {
  const { data } = await api.get('/receitas', {
    params: {
      busca: filtro.busca || undefined,
      categoria: filtro.categoria || undefined,
      limite: filtro.limite,
    },
  });
  return data.data;
}

export async function listarCategorias(): Promise<CategoriaReceita[]> {
  const { data } = await api.get('/receitas/categorias');
  return data.data;
}

export async function buscarReceita(id: string): Promise<Receita> {
  const { data } = await api.get(`/receitas/${id}`);
  return data;
}

/** Ingredientes e modo de preparo são texto livre com uma linha por item. */
export const linhasDeTexto = (texto: string): string[] =>
  texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean);
