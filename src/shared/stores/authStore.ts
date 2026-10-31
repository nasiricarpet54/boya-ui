import { create } from 'zustand';

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
  sendOtp: (phone: string) => Promise<{ success: boolean; message: string; devCode?: string }>;
  loginWithPhone: (phone: string, code: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,

  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true, isLoading: false }),
  clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false }),

  sendOtp: async (phone: string) => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'ارسال کد تایید پیامکی ناموفق بود.');
      }
      return data;
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithPhone: async (phone: string, code: string, fullName?: string) => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, fullName }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'کد تایید معتبر نمی‌باشد.');
      }
      get().setAuth(data.user, data.token);
    } catch (error) {
      console.error('Phone login failed:', error);
      get().clearAuth();
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  logout: async () => {
    get().clearAuth();
  },
}));
