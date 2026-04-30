import { create } from 'zustand';
import { STORAGE_KEYS, secureStorage } from '@/lib/storage';

export type UserRole = 'paciente' | 'nutricionista';

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (params: { user: AuthUser; token: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isHydrated: false,

  hydrate: async () => {
    set({ isLoading: true });
    const [token, userJson] = await Promise.all([
      secureStorage.get(STORAGE_KEYS.authToken),
      secureStorage.get(STORAGE_KEYS.user),
    ]);
    const user = userJson ? (JSON.parse(userJson) as AuthUser) : null;
    set({ token, user, isLoading: false, isHydrated: true });
  },

  setSession: async ({ user, token }) => {
    await secureStorage.set(STORAGE_KEYS.authToken, token);
    await secureStorage.set(STORAGE_KEYS.user, JSON.stringify(user));
    set({ user, token });
  },

  signOut: async () => {
    await secureStorage.remove(STORAGE_KEYS.authToken);
    await secureStorage.remove(STORAGE_KEYS.refreshToken);
    await secureStorage.remove(STORAGE_KEYS.user);
    set({ user: null, token: null });
  },
}));
