import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { env } from './env';
import { STORAGE_KEYS, secureStorage } from './storage';
import { useAuthStore } from '../stores/auth';

export const api: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Cliente separado, sem interceptors, só para renovar a sessão. Se a renovação
 * passasse pelo `api`, um 401 do próprio `/auth/refresh` cairia no interceptor
 * de resposta e tentaria renovar de novo, em laço.
 */
const clienteRenovacao = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

interface RespostaRenovacao {
  accessToken: string;
  refreshToken: string;
}

type RequisicaoOriginal = InternalAxiosRequestConfig & { _renovacaoTentada?: boolean };

api.interceptors.request.use(async (config) => {
  const token = await secureStorage.get(STORAGE_KEYS.authToken);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * A API rotaciona o refresh token: cada uso revoga o anterior e devolve um novo.
 * Por isso a renovação precisa ser única — se duas telas tomarem 401 ao mesmo
 * tempo, a segunda espera a mesma promessa em vez de gastar um token já revogado
 * e derrubar a sessão.
 */
let renovacaoEmAndamento: Promise<string | null> | null = null;

async function renovarSessao(): Promise<string | null> {
  const refreshToken = await secureStorage.get(STORAGE_KEYS.refreshToken);
  if (!refreshToken) return null;

  try {
    const { data } = await clienteRenovacao.post<RespostaRenovacao>('/auth/refresh', {
      refreshToken,
    });
    // Guardar também o refresh token novo: o antigo acabou de ser revogado no banco.
    await useAuthStore.getState().setTokens({
      token: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return data.accessToken;
  } catch {
    return null;
  }
}

function renovarUmaVezSo(): Promise<string | null> {
  if (!renovacaoEmAndamento) {
    renovacaoEmAndamento = renovarSessao().finally(() => {
      renovacaoEmAndamento = null;
    });
  }
  return renovacaoEmAndamento;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const requisicao = error.config as RequisicaoOriginal | undefined;
    // 401 em `/auth/*` é credencial errada ou sessão expirada — renovar não ajuda.
    const rotaDeAutenticacao = requisicao?.url?.startsWith('/auth/') ?? false;

    if (
      error.response?.status !== 401 ||
      !requisicao ||
      requisicao._renovacaoTentada ||
      rotaDeAutenticacao
    ) {
      return Promise.reject(error);
    }

    requisicao._renovacaoTentada = true;
    const novoToken = await renovarUmaVezSo();

    if (!novoToken) {
      // Sessão perdida de vez: limpa o store e os layouts redirecionam para o login.
      await useAuthStore.getState().signOut();
      return Promise.reject(error);
    }

    requisicao.headers.Authorization = `Bearer ${novoToken}`;
    return api(requisicao);
  },
);
