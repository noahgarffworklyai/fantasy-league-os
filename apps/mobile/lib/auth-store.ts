import type { User } from '@flos/shared';
import { create } from 'zustand';
import { api, clearToken, getToken, setToken } from './api';

type AuthState = {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    const token = await getToken();
    if (!token) {
      set({ initialized: true });
      return;
    }
    try {
      const user = await api.get<User>('/auth/me');
      set({ user, initialized: true });
    } catch {
      await clearToken();
      set({ user: null, initialized: true });
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await api.post<{ user: User; token: string }>('/auth/login', {
        email,
        password,
      });
      await setToken(res.token);
      set({ user: res.user, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  register: async (email, password, displayName) => {
    set({ loading: true });
    try {
      const res = await api.post<{ user: User; token: string }>('/auth/register', {
        email,
        password,
        displayName,
      });
      await setToken(res.token);
      set({ user: res.user, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  logout: async () => {
    await clearToken();
    set({ user: null });
  },
}));
