export type UserRole = 'paciente' | 'nutricionista';

export type TipoDiabetes = 'tipo1' | 'tipo2' | 'gestacional' | 'pre' | 'outro';

export const TIPOS_DIABETES: { value: TipoDiabetes; label: string }[] = [
  { value: 'tipo1', label: 'Diabetes tipo 1' },
  { value: 'tipo2', label: 'Diabetes tipo 2' },
  { value: 'gestacional', label: 'Diabetes gestacional' },
  { value: 'pre', label: 'Pré-diabetes' },
  { value: 'outro', label: 'Outro / Não sei' },
];

export type Sexo = 'feminino' | 'masculino' | 'outro';

export const SEXOS: { value: Sexo; label: string }[] = [
  { value: 'feminino', label: 'Feminino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'outro', label: 'Prefiro não dizer' },
];

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface LoginInput {
  email: string;
  senha: string;
}

export interface CadastroInput {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
  tipoDiabetes?: TipoDiabetes;
  dataNascimento?: string;
  sexo?: Sexo;
}
