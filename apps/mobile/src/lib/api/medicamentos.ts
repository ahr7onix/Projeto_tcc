import { api } from '@/lib/api';

export interface Medicamento {
  id: string;
  nome: string;
  dosagem: string;
  frequencia: string;
  horarioInicial: string;
  ativo: boolean;
  criadoEm: string;
}

/**
 * Medicamentos do próprio paciente — a API recorta pelo usuário do token.
 * Quem cadastra e suspende é a nutricionista pelo painel; o app só mostra.
 */
export async function listarMedicamentos(): Promise<Medicamento[]> {
  const { data } = await api.get('/medicamentos');
  return data.data;
}

/** "08:00:00" vem do banco como hora completa; na tela só interessa HH:MM. */
export const horaCurta = (horario: string): string => horario.slice(0, 5);
