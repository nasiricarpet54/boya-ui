import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore, getAppModeForRole } from './authStore';

export type NavTab = 'home' | 'salons' | 'bookings' | 'saved' | 'profile';

export type AppExperienceMode = 'customer' | 'salon_panel' | 'admin_panel';

interface UIState {
  appMode: AppExperienceMode;
  activeTab: NavTab;
  isMobileFrame: boolean;
  isLocationModalOpen: boolean;
  toastMessage: string | null;
  showSplashScreen: boolean;
  splashAppName: string;

  setAppMode: (mode: AppExperienceMode) => void;
  setActiveTab: (tab: NavTab) => void;
  setIsMobileFrame: (isMobile: boolean) => void;
  setIsLocationModalOpen: (isOpen: boolean) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
  setShowSplashScreen: (show: boolean) => void;
  setSplashAppName: (name: string) => void;
}

// Show the splash once per browser session, not on every reload — otherwise
// a hard refresh or a router navigation replays the full intro animation.
const hasShownSplashThisSession = typeof window !== 'undefined'
  && window.sessionStorage.getItem('boya-splash-shown') === '1';

const markSplashShown = () => {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('boya-splash-shown', '1');
  }
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      appMode: 'customer',
      activeTab: 'home',
      isMobileFrame: true,
      isLocationModalOpen: false,
      toastMessage: null,
      showSplashScreen: !hasShownSplashThisSession,
      splashAppName: 'ورود به اپلیکیشن هوشمند مشتریان بویا',

      // ROLE LOCK: once a user logs in with a role, they stay in that role's
      // panel until logout. Any attempt to switch appMode while authenticated
      // is silently dropped — a salon_admin can never reach the customer
      // storefront with the same login, and neither can any other staff role.
      setAppMode: (requestedMode) => {
        const { user, isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated || !user) {
          // Not logged in: only the customer shell is meaningful.
          set({ appMode: 'customer' });
          return;
        }
        const lockedMode = getAppModeForRole(user.role);
        if (requestedMode !== lockedMode) {
          if (import.meta.env.DEV) {
            console.warn('[ROLE LOCK] panel switch blocked:', requestedMode, '→', lockedMode);
          }
          return; // ignore the switch, keep the current panel
        }
        set({ appMode: requestedMode });
      },
  setActiveTab: (activeTab) => set({ activeTab }),
  setIsMobileFrame: (isMobileFrame) => set({ isMobileFrame }),
  setIsLocationModalOpen: (isLocationModalOpen) => set({ isLocationModalOpen }),
  showToast: (toastMessage) => {
    set({ toastMessage });
    setTimeout(() => set({ toastMessage: null }), 2800);
  },
  hideToast: () => set({ toastMessage: null }),
      setShowSplashScreen: (showSplashScreen) => {
        if (!showSplashScreen) markSplashShown();
        set({ showSplashScreen });
      },
      setSplashAppName: (splashAppName) => set({ splashAppName }),
    }),
    {
      name: 'boya-ui-storage',
      partialize: (state) => ({ appMode: state.appMode }),
      // Re-derive appMode from the real (server-verified) role on hydration so
      // a hand-edited localStorage value can never smuggle a wrong panel in.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const { user, isAuthenticated } = useAuthStore.getState();
        state.appMode = (!isAuthenticated || !user)
          ? 'customer'
          : getAppModeForRole(user.role);
      },
    },
  ),
);
