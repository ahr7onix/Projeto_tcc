import { create } from 'zustand';
import { STORAGE_KEYS, secureStorage } from '@/lib/storage';
import type { AuthUser } from '@/types/auth';

export type { AuthUser, UserRole } from '@/types/auth';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (params: {
    user: AuthUser;
    token: string;
    refreshToken: string;
  }) => Promise<void>;
  setTokens: (params: { token: string; refreshToken: string }) => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  isHydrated: false,

  hydrate: async () => {
    set({ isLoading: true });
    const [token, refreshToken, userJson] = await Promise.all([
      secureStorage.get(STORAGE_KEYS.authToken),
      secureStorage.get(STORAGE_KEYS.refreshToken),
      secureStorage.get(STORAGE_KEYS.user),
    ]);
    const user = userJson ? (JSON.parse(userJson) as AuthUser) : null;
    set({ token, refreshToken, user, isLoading: false, isHydrated: true });
  },

  setSession: async ({ user, token, refreshToken }) => {
    await Promise.all([
      secureStorage.set(STORAGE_KEYS.authToken, token),
      secureStorage.set(STORAGE_KEYS.refreshToken, refreshToken),
      secureStorage.set(STORAGE_KEYS.user, JSON.stringify(user)),
    ]);
    set({ user, token, refreshToken });
  },

  // Usado pela renovação automática: troca só os tokens e mantém o usuário logado.
  setTokens: async ({ token, refreshToken }) => {
    await Promise.all([
      secureStorage.set(STORAGE_KEYS.authToken, token),
      secureStorage.set(STORAGE_KEYS.refreshToken, refreshToken),
    ]);
    set({ token, refreshToken });
  },

  updateUser: async (patch) => {
    const current = useAuthStore.getState().user;
    if (!current) return;
    const next = { ...current, ...patch };
    await secureStorage.set(STORAGE_KEYS.user, JSON.stringify(next));
    set({ user: next });
  },

  signOut: async () => {
    await Promise.all([
      secureStorage.remove(STORAGE_KEYS.authToken),
      secureStorage.remove(STORAGE_KEYS.refreshToken),
      secureStorage.remove(STORAGE_KEYS.user),
    ]);
    set({ user: null, token: null, refreshToken: null });
  },
}));
