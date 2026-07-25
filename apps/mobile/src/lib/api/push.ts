import { api } from '@/lib/api';

export async function registrarPushToken(
  token: string,
  plataforma: 'ios' | 'android' | 'web',
) {
  const { data } = await api.post('/push/token', { token, plataforma });
  return data;
}

export async function removerPushToken(token: string) {
  const { data } = await api.delete('/push/token', {
    data: { token },
  });
  return data;
}
