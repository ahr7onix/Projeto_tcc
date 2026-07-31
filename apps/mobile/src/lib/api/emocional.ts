import { api } from '@/lib/api';

export type EstadoEmocional = 'muito_bem' | 'bem' | 'neutro' | 'mal' | 'muito_mal';

export interface RegistroEmocional {
  id: string;
  dataHora: string;
  estado: EstadoEmocional;
  rotuloEstado: string;
  intensidade: number | null;
  /** Texto livre com os fatores separados por vírgula ("noite mal dormida, prova"). */
  fatores: string | null;
  observacao: string | null;
}

export interface ResumoEmocional {
  periodoDias: number;
  total: number;
  /** Média na escala de 1 (muito mal) a 5 (muito bem). Não é nota: serve de tendência. */
  mediaEscala: number | null;
  porEstado: { estado: string; rotulo: string; total: number }[];
  fatoresFrequentes: { fator: string; vezes: number }[];
}

export interface EmocionalInput {
  estado: EstadoEmocional;
  intensidade?: number;
  fatores?: string;
  observacao?: string;
}

/**
 * Registros do próprio paciente — a API recorta pelo usuário do token,
 * então não existe parâmetro de paciente para o app mandar.
 */
export async function listarEmocional(dias?: number, limite?: number): Promise<RegistroEmocional[]> {
  const { data } = await api.get('/emocional', { params: { dias, limite } });
  return data.data;
}

export async function buscarResumoEmocional(dias = 30): Promise<ResumoEmocional> {
  const { data } = await api.get('/emocional/resumo', { params: { dias } });
  return data;
}

export async function criarEmocional(input: EmocionalInput): Promise<RegistroEmocional> {
  const { data } = await api.post('/emocional', input);
  return data;
}

/** Os mesmos cinco estados que a API aceita, na ordem em que aparecem na tela. */
export const ESTADOS: { valor: EstadoEmocional; rotulo: string; emoji: string }[] = [
  { valor: 'muito_bem', rotulo: 'Muito bem', emoji: '😄' },
  { valor: 'bem', rotulo: 'Bem', emoji: '🙂' },
  { valor: 'neutro', rotulo: 'Neutro', emoji: '😐' },
  { valor: 'mal', rotulo: 'Mal', emoji: '🙁' },
  { valor: 'muito_mal', rotulo: 'Muito mal', emoji: '😢' },
];
