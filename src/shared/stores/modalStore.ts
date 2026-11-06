import { create } from 'zustand';
import { Salon, SalonService, Specialist } from '../data/marketplaceData';
import { useAuthStore } from './authStore';

// ROLE LOCK: customer-facing flows (booking, quick view, specialist portfolio,
// global search) must not open inside a staff panel. Guests may still open
// them — the booking modal prompts for login on submit.
const guardCustomerOnly = (): boolean => {
  const { user, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated || !user) return true;
  return user.role === 'customer';
};

interface ModalState {
  bookingData: {
    salon: Salon;
    service: SalonService;
    specialist: Specialist;
    date: string;
    time: string;
  } | null;
  isBookingModalOpen: boolean;
  
  portfolioSpecialist: Specialist | null;
  portfolioSalon: Salon | null;
  isPortfolioModalOpen: boolean;

  quickViewSalon: Salon | null;
  isQuickViewModalOpen: boolean;

  //.services-portfolio showcase ("نمایشگاه نمونه‌کارها"): keyed by salon id,
  // null means the cross-salon showcase of every published sample-work image.
  showcaseSalonId: number | string | null;
  isShowcaseModalOpen: boolean;

  isAuthModalOpen: boolean;

  isSearchModalOpen: boolean;
  searchInitialQuery: string;
  openSearchModal: (initialQuery?: string) => void;
  closeSearchModal: () => void;

  openBookingModal: (salon: Salon, service: SalonService, specialist: Specialist, date: string, time: string) => void;
  closeBookingModal: () => void;

  openPortfolioModal: (specialist: Specialist, salon: Salon) => void;
  closePortfolioModal: () => void;

  openQuickViewModal: (salon: Salon) => void;
  closeQuickViewModal: () => void;

  openShowcaseModal: (salonId?: number | string | null) => void;
  closeShowcaseModal: () => void;

  openAuthModal: () => void;
  closeAuthModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  bookingData: null,
  isBookingModalOpen: false,
  
  portfolioSpecialist: null,
  portfolioSalon: null,
  isPortfolioModalOpen: false,

  quickViewSalon: null,
  isQuickViewModalOpen: false,

  isAuthModalOpen: false,

  isSearchModalOpen: false,
  searchInitialQuery: '',
  openSearchModal: (initialQuery = '') => {
    if (!guardCustomerOnly()) return;
    set({ isSearchModalOpen: true, searchInitialQuery: initialQuery });
  },
  closeSearchModal: () => set({ isSearchModalOpen: false, searchInitialQuery: '' }),

  openBookingModal: (salon, service, specialist, date, time) => {
    if (!guardCustomerOnly()) return;
    set({
      bookingData: { salon, service, specialist, date, time },
      isBookingModalOpen: true,
    });
  },
  closeBookingModal: () => set({ isBookingModalOpen: false, bookingData: null }),

  openPortfolioModal: (specialist, salon) => {
    if (!guardCustomerOnly()) return;
    set({
      portfolioSpecialist: specialist,
      portfolioSalon: salon,
      isPortfolioModalOpen: true,
    });
  },
  closePortfolioModal: () => set({ isPortfolioModalOpen: false, portfolioSpecialist: null, portfolioSalon: null }),

  openQuickViewModal: (salon) => {
    if (!guardCustomerOnly()) return;
    set({
      quickViewSalon: salon,
      isQuickViewModalOpen: true,
    });
  },
  closeQuickViewModal: () => set({ isQuickViewModalOpen: false, quickViewSalon: null }),

  showcaseSalonId: null,
  isShowcaseModalOpen: false,
  openShowcaseModal: (salonId = null) => set({ isShowcaseModalOpen: true, showcaseSalonId: salonId }),
  closeShowcaseModal: () => set({ isShowcaseModalOpen: false, showcaseSalonId: null }),

  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
}));
