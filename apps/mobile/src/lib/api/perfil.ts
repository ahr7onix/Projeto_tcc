import { api } from '@/lib/api';

export interface UpdatePerfilInput {
  nome?: string;
  senhaAtual?: string;
  novaSenha?: string;
}

export interface PacienteDataInput {
  dataNascimento?: string;
  sexo?: string;
  tipoDiabetes?: string;
  peso?: number;
  altura?: number;
  restricoesAlergias?: string;
}

export async function updatePerfil(input: UpdatePerfilInput) {
  const { data } = await api.patch('/perfil', input);
  return data;
}

export async function getPacienteData() {
  const { data } = await api.get('/perfil/paciente');
  return data;
}

export async function updatePacienteData(input: PacienteDataInput) {
  const { data } = await api.patch('/perfil/paciente', input);
  return data;
}

/**
 * Encerra a conta do próprio usuário (soft delete no servidor). Exige a senha
 * de novo: um aparelho desbloqueado por terceiro não deve conseguir apagar a
 * conta só por já estar logado.
 */
export async function desativarConta(senha: string) {
  const { data } = await api.delete('/perfil', { data: { senha } });
  return data as { message: string };
}
