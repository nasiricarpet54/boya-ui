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

export const useUIStore = create<UIState>((set) => ({
  appMode: 'customer',
  activeTab: 'home',
  isMobileFrame: true,
  isLocationModalOpen: false,
  toastMessage: null,
  showSplashScreen: true,
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
  setShowSplashScreen: (showSplashScreen) => set({ showSplashScreen }),
  setSplashAppName: (splashAppName) => set({ splashAppName }),
}));
