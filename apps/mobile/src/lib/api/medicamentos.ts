import { api } from '@/lib/api';

export interface Medicamento {
  id: string;
  nome: string;
  dosagem: string;
  frequencia: string;
  horarioInicial: string;
  ativo: boolean;
  observacoes: string | null;
  criadoEm: string;
}

export interface MedicamentoInput {
  nome: string;
  dosagem: string;
  frequencia: string;
  horarioInicial: string;
  observacoes?: string;
}

/** Medicamentos do próprio paciente — a API recorta pelo usuário do token. */
export async function listarMedicamentos(): Promise<Medicamento[]> {
  const { data } = await api.get('/medicamentos');
  return data.data;
}

export async function criarMedicamento(input: MedicamentoInput): Promise<Medicamento> {
  const { data } = await api.post('/medicamentos', input);
  return data;
}

export async function atualizarMedicamento(
  id: string,
  input: Partial<MedicamentoInput>,
): Promise<Medicamento> {
  const { data } = await api.patch(`/medicamentos/${id}`, input);
  return data;
}

/**
 * Remover no app significa suspender: a API nunca apaga o registro, só marca
 * `ativo = false`, para preservar o histórico de uso do paciente.
 */
export async function removerMedicamento(id: string): Promise<Medicamento> {
  const { data } = await api.delete(`/medicamentos/${id}`);
  return data;
}

/** "08:00:00" vem do banco como hora completa; na tela só interessa HH:MM. */
export const horaCurta = (horario: string): string => horario.slice(0, 5);
