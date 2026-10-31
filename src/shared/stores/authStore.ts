import { create } from 'zustand';
import { auth, googleAuthProvider } from '../../lib/firebase.ts';
import { signInWithPopup, signOut } from 'firebase/auth';

export type UserRole = 'customer' | 'salon_specialist' | 'mobile_specialist' | 'line_manager' | 'salon_admin' | 'super_admin';

export interface User {
  id: number;
  uid: string;
  fullName: string;
  role: UserRole;
  phone: string;
  email: string;
  salonId?: number | null;
  managedLine?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,

  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true, isLoading: false }),
  clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false }),

  login: async () => {
    set({ isLoading: true });
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      
      // Fetch DB user profile
      const response = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch profile');
      
      const dbUser = await response.json();
      get().setAuth(dbUser, token);
    } catch (error) {
      console.error('Login failed:', error);
      get().clearAuth();
      throw error;
    }
  },
  
  logout: async () => {
    try {
      await signOut(auth);
    } finally {
      get().clearAuth();
    }
  },
}));
