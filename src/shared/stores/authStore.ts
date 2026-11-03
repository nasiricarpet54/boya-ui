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
  avatar?: string | null;
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
  updateProfile: (patch: { fullName?: string; avatar?: string; email?: string }) => Promise<any>;
  logout: () => Promise<void>;
}

export const isSuperAdmin = (role?: UserRole | null): boolean => role === 'super_admin';

export const isSalonStaffRole = (role?: UserRole | null): boolean =>
  ['salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager'].includes(role || '');

export const isCustomerRole = (role?: UserRole | null): boolean => role === 'customer';

export const getAppModeForRole = (role?: UserRole | null): 'admin_panel' | 'salon_panel' | 'customer' => {
  if (isSuperAdmin(role)) return 'admin_panel';
  if (isSalonStaffRole(role)) return 'salon_panel';
  return 'customer';
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isSessionVerified: false,

      setAuth: (user) => {
        set({ user, isAuthenticated: true, isLoading: false, isSessionVerified: true });
        useUIStore.getState().setAppMode(getAppModeForRole(user.role));
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
            if (response.status === 401 || response.status === 403) {
              get().clearAuth();
            }
            return null;
          }

          const verifiedUser: User = await response.json();
          set({
            user: verifiedUser,
            isAuthenticated: true,
            isLoading: false,
            isSessionVerified: true,
          });

          useUIStore.getState().setAppMode(getAppModeForRole(verifiedUser.role));

          return verifiedUser;
        } catch (err) {
          console.warn('[AUTH SESSION VERIFY NOTICE] Temporary network glitch or connection error, keeping cached session:', err);
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
      
      updateProfile: async (patch: { fullName?: string; avatar?: string; email?: string }) => {
        try {
          const res = await fetch('/api/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
            credentials: 'include',
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'خطا در ویرایش پروفایل.');
          
          if (data.user) {
            set((state) => ({
              user: state.user ? { ...state.user, ...data.user } : data.user,
            }));
          }
          return data.user;
        } catch (err) {
          console.error('[UPDATE PROFILE ERROR]', err);
          throw err;
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
