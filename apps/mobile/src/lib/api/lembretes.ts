import { api } from '@/lib/api';

export type TipoLembrete = 'refeicao' | 'glicemia' | 'medicamento' | 'outro';

export interface Lembrete {
  id: string;
  tipo: TipoLembrete;
  titulo: string | null;
  descricao: string | null;
  recorrente: boolean;
  /** "HH:MM" nos recorrentes; null nos avulsos. */
  hora: string | null;
  dataHora: string | null;
  /** 0 = domingo ... 6 = sábado. Vazio num recorrente significa todos os dias. */
  diasSemana: number[];
  ativo: boolean;
  concluido: boolean;
  medicamentoId: string | null;
  /** Frase pronta da API: "segunda, quarta às 07:00". */
  quando: string;
  criadoEm: string;
}

export interface LembreteInput {
  tipo: TipoLembrete;
  titulo: string;
  descricao?: string;
  recorrente?: boolean;
  hora?: string;
  dataHora?: string;
  diasSemana?: number[];
  medicamentoId?: string;
}

/**
 * Lembretes do próprio paciente — a API recorta pelo usuário do token,
 * então não existe parâmetro de paciente para o app mandar.
 */
export async function listarLembretes(apenasAtivos = false): Promise<Lembrete[]> {
  const { data } = await api.get('/lembretes', {
    params: { apenasAtivos: apenasAtivos ? 'true' : undefined },
  });
  return data.data;
}

/** Os que caem hoje, com o dia da semana calculado no banco (não no celular). */
export async function lembretesDeHoje(): Promise<Lembrete[]> {
  const { data } = await api.get('/lembretes/hoje');
  return data.data;
}

export async function criarLembrete(input: LembreteInput): Promise<Lembrete> {
  const { data } = await api.post('/lembretes', input);
  return data;
}

export async function atualizarLembrete(
  id: string,
  input: Partial<LembreteInput> & { ativo?: boolean; concluido?: boolean },
): Promise<Lembrete> {
  const { data } = await api.patch(`/lembretes/${id}`, input);
  return data;
}

export async function concluirLembrete(id: string): Promise<Lembrete> {
  const { data } = await api.patch(`/lembretes/${id}/concluir`);
  return data;
}

export async function removerLembrete(id: string): Promise<void> {
  await api.delete(`/lembretes/${id}`);
}

export const NOMES_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const ROTULO_TIPO: Record<TipoLembrete, string> = {
  glicemia: 'Medir glicemia',
  medicamento: 'Tomar medicamento',
  refeicao: 'Refeição',
  outro: 'Outro',
};

export const ICONE_TIPO: Record<TipoLembrete, 'water-outline' | 'medkit-outline' | 'restaurant-outline' | 'alarm-outline'> = {
  glicemia: 'water-outline',
  medicamento: 'medkit-outline',
  refeicao: 'restaurant-outline',
  outro: 'alarm-outline',
};
