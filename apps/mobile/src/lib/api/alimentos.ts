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

/**
 * A tabela de alimentos é de consulta livre para os três perfis — o paciente
 * precisa dela para saber quanto carboidrato tem no que vai comer.
 */
export async function listarAlimentos(
  filtro: { busca?: string; grupo?: string; limite?: number } = {},
): Promise<Alimento[]> {
  const { data } = await api.get('/alimentos', {
    params: {
      busca: filtro.busca?.trim() || undefined,
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

/** Rótulo curto da porção: "1 fatia média (25 g)" ou, sem medida caseira, "100 g". */
export function descreverPorcao(alimento: Alimento): string {
  if (alimento.medidaCaseira && alimento.medidaCaseiraG) {
    return `${alimento.medidaCaseira} (${alimento.medidaCaseiraG} g)`;
  }
  return `${alimento.porcaoG} g`;
}

/**
 * Uma casa decimal só quando o número precisa: 28 e 28,4.
 *
 * O arredondamento é o mesmo do servidor (`arredondar` em common/nutricao):
 * com `toFixed` a prévia mostrava 24,9 e o registro salvo ficava 25, porque
 * 24,95 em ponto flutuante é 24,9499... e as duas funções decidiam diferente.
 */
export function formatarQuantidade(valor: number): string {
  const arredondado = Math.round(valor * 10) / 10;
  return Number.isInteger(arredondado)
    ? String(arredondado)
    : String(arredondado).replace('.', ',');
}

/** Os grupos vem do banco; o mapa so troca o nome tecnico pelo do dia a dia. */
const ROTULO_GRUPO: Record<string, string> = {
  acucares: 'Açúcares',
  carnes: 'Carnes',
  cereais: 'Cereais e massas',
  frutas: 'Frutas',
  hortalicas: 'Hortaliças',
  laticinios: 'Leite e derivados',
  leguminosas: 'Leguminosas',
  oleaginosas: 'Oleaginosas',
  oleos: 'Óleos e gorduras',
  ovos: 'Ovos',
  paes: 'Pães',
  pescados: 'Peixes',
  tuberculos: 'Tubérculos',
  outros: 'Outros',
};

export const rotuloGrupo = (grupo: string): string =>
  ROTULO_GRUPO[grupo] ?? grupo.charAt(0).toUpperCase() + grupo.slice(1);
