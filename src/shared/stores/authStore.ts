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
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSessionVerified: boolean;
  
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  verifySession: () => Promise<User | null>;
  sendOtp: (phone: string) => Promise<{ success: boolean; message: string; devCode?: string }>;
  loginWithPhone: (phone: string, code: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      isSessionVerified: false,

      setAuth: (user, accessToken) => {
        set({ user, accessToken, isAuthenticated: true, isLoading: false, isSessionVerified: true });
        // Automatically sync appMode based on strictly verified server role
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
        set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, isSessionVerified: true });
        useUIStore.getState().setAppMode('customer');
        // Clear HttpOnly cookie on backend as well
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
      },

      // Security A-07: Always verify session and role against PostgreSQL server on app start
      verifySession: async () => {
        const token = get().accessToken;
        set({ isLoading: true });
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch('/api/profile', {
            method: 'GET',
            headers,
            credentials: 'include',
          });

          if (!response.ok) {
            // Token is invalid, expired, or missing
            get().clearAuth();
            return null;
          }

          const verifiedUser: User = await response.json();
          // Update client user with strictly server-verified database data
          set({
            user: verifiedUser,
            isAuthenticated: true,
            isLoading: false,
            isSessionVerified: true,
          });

          // Sync verified role to UI mode
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
          console.error('[AUTH VERIFY SESSION ERROR]', err);
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
          const cleanPhone = normalizePhone(phone);
          const response = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanPhone, code: code.trim(), fullName }),
            credentials: 'include',
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
        try {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } finally {
          get().clearAuth();
        }
      },
    }),
    {
      name: 'boya-auth-storage',
      // Security: Do NOT persist accessToken or credentials in localStorage to prevent XSS token theft.
      // Authentication tokens are stored strictly in HttpOnly cookies managed by the server.
      partialize: () => ({}),
    }
  )
);
