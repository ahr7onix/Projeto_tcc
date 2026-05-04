export type UserRole = 'paciente' | 'nutricionista';

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
}
