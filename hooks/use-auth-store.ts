import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  fullName?: string;
}

interface AuthState {
  user: User | null;
  role: 'cliente' | 'tatuador' | 'estudio' | null;
  setUser: (user: User | null) => void;
  setRole: (role: 'cliente' | 'tatuador' | 'estudio' | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  clearAuth: () => set({ user: null, role: null }),
}));
