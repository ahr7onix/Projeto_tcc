import { api } from '@/lib/api';
import { STORAGE_KEYS, secureStorage } from '@/lib/storage';
import type {
  AuthResponse,
  CadastroInput,
  EsqueciSenhaInput,
  EsqueciSenhaResponse,
  LoginInput,
} from '@/types/auth';

export async function login(input: LoginInput): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', input);
  return data;
}

export async function loginGoogle(idToken: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/google/paciente', {
    idToken,
  });
  return data;
}

export async function cadastro(input: CadastroInput): Promise<AuthResponse> {
  // App mobile: sempre paciente — o papel vem da rota, não do corpo.
  const { role: _role, ...payload } = input;
  const { data } = await api.post<AuthResponse>(
    '/auth/cadastro/paciente',
    payload,
  );
  return data;
}

export async function logout(): Promise<void> {
  // A rota exige o refresh token no corpo — é ele que será revogado no banco.
  const refreshToken = await secureStorage.get(STORAGE_KEYS.refreshToken);
  if (!refreshToken) return;
  await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
}

export async function esqueciSenha(
  input: EsqueciSenhaInput,
): Promise<EsqueciSenhaResponse> {
  const { data } = await api.post<EsqueciSenhaResponse>(
    '/auth/esqueci-senha',
    input,
  );
  return data;
}
