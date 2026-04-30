import axios, { AxiosError, type AxiosInstance } from 'axios';
import { env } from './env';
import { STORAGE_KEYS, secureStorage } from './storage';

export const api: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await secureStorage.get(STORAGE_KEYS.authToken);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await secureStorage.remove(STORAGE_KEYS.authToken);
      await secureStorage.remove(STORAGE_KEYS.refreshToken);
      await secureStorage.remove(STORAGE_KEYS.user);
    }
    return Promise.reject(error);
  },
);
