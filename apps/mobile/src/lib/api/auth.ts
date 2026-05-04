import { api } from '@/lib/api';
import type {
  AuthResponse,
  CadastroInput,
  LoginInput,
} from '@/types/auth';

export async function login(input: LoginInput): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', input);
  return data;
}

export async function cadastro(input: CadastroInput): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/cadastro', input);
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout').catch(() => undefined);
}
