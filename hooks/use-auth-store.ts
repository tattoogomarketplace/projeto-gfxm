import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  // Adicione outros campos necessários do usuário
}

interface AuthState {
  user: User | null;
  role: 'client' | 'artist' | 'studio' | null;
  setUser: (user: User | null) => void;
  setRole: (role: 'client' | 'artist' | 'studio' | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  clearAuth: () => set({ user: null, role: null }),
}));
