import { create } from 'zustand';
import { Salon, SalonService, Specialist } from '../data/marketplaceData';

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

  openBookingModal: (salon: Salon, service: SalonService, specialist: Specialist, date: string, time: string) => void;
  closeBookingModal: () => void;
  
  openPortfolioModal: (specialist: Specialist, salon: Salon) => void;
  closePortfolioModal: () => void;

  openQuickViewModal: (salon: Salon) => void;
  closeQuickViewModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  bookingData: null,
  isBookingModalOpen: false,
  
  portfolioSpecialist: null,
  portfolioSalon: null,
  isPortfolioModalOpen: false,

  quickViewSalon: null,
  isQuickViewModalOpen: false,

  openBookingModal: (salon, service, specialist, date, time) => set({
    bookingData: { salon, service, specialist, date, time },
    isBookingModalOpen: true,
  }),
  closeBookingModal: () => set({ isBookingModalOpen: false, bookingData: null }),

  openPortfolioModal: (specialist, salon) => set({
    portfolioSpecialist: specialist,
    portfolioSalon: salon,
    isPortfolioModalOpen: true,
  }),
  closePortfolioModal: () => set({ isPortfolioModalOpen: false, portfolioSpecialist: null, portfolioSalon: null }),

  openQuickViewModal: (salon) => set({
    quickViewSalon: salon,
    isQuickViewModalOpen: true,
  }),
  closeQuickViewModal: () => set({ isQuickViewModalOpen: false, quickViewSalon: null }),
}));
