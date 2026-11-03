import { create } from 'zustand';

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

export const useUIStore = create<UIState>((set) => ({
  appMode: 'customer',
  activeTab: 'home',
  isMobileFrame: true,
  isLocationModalOpen: false,
  toastMessage: null,
  showSplashScreen: !hasShownSplashThisSession,
  splashAppName: 'ورود به اپلیکیشن هوشمند مشتریان بویا',

  setAppMode: (appMode) => set({ appMode }),
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
}));
