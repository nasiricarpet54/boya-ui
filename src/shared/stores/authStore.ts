import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { normalizePhone } from '../utils/persianUtils';
import { useUIStore } from './uiStore';

export type UserRole = 'customer' | 'salon_specialist' | 'mobile_specialist' | 'line_manager' | 'salon_admin' | 'super_admin';

export interface User {
  id: number;
  uid: string;
  fullName: string;
  role: UserRole;
  phone: string;
  email: string;
  salonId?: string | number | null;
  managedLine?: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSessionVerified: boolean;
  
  setAuth: (user: User) => void;
  clearAuth: () => void;
  verifySession: () => Promise<User | null>;
  sendOtp: (phone: string) => Promise<{ success: boolean; message: string }>;
  loginWithPhone: (phone: string, code: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isSessionVerified: false,

      setAuth: (user) => {
        set({ user, isAuthenticated: true, isLoading: false, isSessionVerified: true });
        const uiStore = useUIStore.getState();
        if (user.role === 'super_admin') {
          uiStore.setAppMode('admin_panel');
        } else if (['salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager'].includes(user.role)) {
          uiStore.setAppMode('salon_panel');
        } else {
          uiStore.setAppMode('customer');
        }
      },

      clearAuth: () => {
        set({ user: null, isAuthenticated: false, isLoading: false, isSessionVerified: true });
        useUIStore.getState().setAppMode('customer');
      },

      verifySession: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/profile', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });

          if (!response.ok) {
            get().clearAuth();
            return null;
          }

          const verifiedUser: User = await response.json();
          set({
            user: verifiedUser,
            isAuthenticated: true,
            isLoading: false,
            isSessionVerified: true,
          });

          const uiStore = useUIStore.getState();
          if (verifiedUser.role === 'super_admin') {
            uiStore.setAppMode('admin_panel');
          } else if (['salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager'].includes(verifiedUser.role)) {
            uiStore.setAppMode('salon_panel');
          } else {
            uiStore.setAppMode('customer');
          }

          return verifiedUser;
        } catch (err) {
          get().clearAuth();
          return null;
        } finally {
          set({ isLoading: false, isSessionVerified: true });
        }
      },

      sendOtp: async (phone: string) => {
        set({ isLoading: true });
        try {
          const cleanPhone = normalizePhone(phone);
          const response = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanPhone }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'ارسال کد تایید پیامکی ناموفق بود.');
          return data;
        } finally {
          set({ isLoading: false });
        }
      },

      loginWithPhone: async (phone: string, code: string, fullName?: string) => {
        set({ isLoading: true });
        try {
          const cleanPhone = normalizePhone(phone);
          const response = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanPhone, code: code.trim(), fullName }),
            credentials: 'include',
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'کد تایید معتبر نمی‌باشد.');
          get().setAuth(data.user);
        } catch (error) {
          get().clearAuth();
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
      
      logout: async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } finally {
          get().clearAuth();
          window.location.href = '/';
        }
      },
    }),
    {
      name: 'boya-auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
