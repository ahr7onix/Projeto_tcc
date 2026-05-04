import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import * as authApi from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth';
import type { AuthResponse, CadastroInput, LoginInput } from '@/types/auth';

export function extractAuthError(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    if (error.code === 'ERR_NETWORK') return 'Sem conexão com o servidor.';
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    if (Array.isArray(data?.message)) return data.message.join(', ');
    if (typeof data?.message === 'string') return data.message;
  }
  return fallback;
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation<AuthResponse, AxiosError, LoginInput>({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      await setSession({
        user: data.user,
        token: data.accessToken,
        refreshToken: data.refreshToken,
      });
    },
  });
}

export function useCadastro() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation<AuthResponse, AxiosError, CadastroInput>({
    mutationFn: authApi.cadastro,
    onSuccess: async (data) => {
      await setSession({
        user: data.user,
        token: data.accessToken,
        refreshToken: data.refreshToken,
      });
    },
  });
}
