import { api } from '@/lib/api';

export interface Alimento {
  id: string;
  nome: string;
  grupo: string;
  medidaCaseira: string | null;
  medidaCaseiraG: number | null;
  porcaoG: number;
  kcal: number;
  carboidratosG: number;
  proteinasG: number;
  lipidiosG: number;
  fibrasG: number | null;
  indiceGlicemico: number | null;
  fonte: string;
  ativo: boolean;
}

export interface GrupoAlimento {
  grupo: string;
  total: number;
}

export interface FiltroAlimentos {
  busca?: string;
  grupo?: string;
  limite?: number;
}

export async function listarAlimentos(filtro: FiltroAlimentos = {}): Promise<Alimento[]> {
  const { data } = await api.get('/alimentos', {
    params: {
      busca: filtro.busca || undefined,
      grupo: filtro.grupo || undefined,
      limite: filtro.limite,
    },
  });
  return data.data;
}

export async function listarGrupos(): Promise<GrupoAlimento[]> {
  const { data } = await api.get('/alimentos/grupos');
  return data.data;
}

export async function buscarAlimento(id: string): Promise<Alimento> {
  const { data } = await api.get(`/alimentos/${id}`);
  return data;
}

/** Rótulo curto do alimento na lista: "100 g" ou "1 colher (25 g)". */
export function descreverPorcao(alimento: Alimento): string {
  if (alimento.medidaCaseira && alimento.medidaCaseiraG) {
    return `${alimento.medidaCaseira} (${alimento.medidaCaseiraG} g)`;
  }
  return `${alimento.porcaoG} g`;
}
