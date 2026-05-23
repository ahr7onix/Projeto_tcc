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
