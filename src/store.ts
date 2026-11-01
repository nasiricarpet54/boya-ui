import { create } from 'zustand';
import { User, Salon, Booking } from './types';
import { currentUser, mockBookings, salons, allUsers } from './data';

interface AppState {
  // Navigation
  currentTab: 'home' | 'salons' | 'bookings' | 'profile';
  setCurrentTab: (tab: 'home' | 'salons' | 'bookings' | 'profile') => void;

  // Auth
  user: User | null;
  isAuthenticated: boolean;
  login: (phone: string, otp: string) => boolean;
  logout: () => void;

  // Salons
  salons: Salon[];
  savedSalonIds: string[];
  toggleSaveSalon: (salonId: string) => void;

  // Bookings
  bookings: Booking[];
  addBooking: (booking: Booking) => void;

  // UI
  isBookingModalOpen: boolean;
  bookingModalData: {
    salon: Salon | null;
    service: Salon['services'][0] | null;
    specialist: Salon['specialists'][0] | null;
    date: string;
    time: string;
  } | null;
  openBookingModal: (salon: Salon, service: Salon['services'][0], specialist: Salon['specialists'][0], date: string, time: string) => void;
  closeBookingModal: () => void;

  // Toast
  toastMessage: string;
  showToast: (msg: string) => void;

  // Location
  selectedProvince: string;
  selectedCity: string;
  setSelectedProvince: (p: string) => void;
  setSelectedCity: (c: string) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentTab: 'home',
  setCurrentTab: (tab) => set({ currentTab: tab }),

  // Auth
  user: null,
  isAuthenticated: false,
  login: (phone: string, _otp: string) => {
    const foundUser = allUsers.find(u => u.phone === phone);
    if (foundUser) {
      const authenticatedUser = { ...foundUser, isAuthenticated: true };
      set({ user: authenticatedUser, isAuthenticated: true });
      return true;
    }
    const newCustomer: User = {
      id: `user-${Date.now()}`,
      phone,
      name: 'کاربر جدید',
      role: 'customer',
      avatar: '👤',
      isAuthenticated: true,
    };
    set({ user: newCustomer, isAuthenticated: true });
    return true;
  },
  logout: () => set({ user: null, isAuthenticated: false }),

  // Salons
  salons,
  savedSalonIds: ['salon-1', 'salon-3'],
  toggleSaveSalon: (salonId) => set((state) => ({
    savedSalonIds: state.savedSalonIds.includes(salonId)
      ? state.savedSalonIds.filter(id => id !== salonId)
      : [...state.savedSalonIds, salonId]
  })),

  // Bookings
  bookings: mockBookings,
  addBooking: (booking) => set((state) => ({ bookings: [booking, ...state.bookings] })),

  // UI
  isBookingModalOpen: false,
  bookingModalData: null,
  openBookingModal: (salon, service, specialist, date, time) => set({
    isBookingModalOpen: true,
    bookingModalData: { salon, service, specialist, date, time }
  }),
  closeBookingModal: () => set({ isBookingModalOpen: false, bookingModalData: null }),

  // Toast
  toastMessage: '',
  showToast: (msg) => {
    set({ toastMessage: msg });
    setTimeout(() => set({ toastMessage: '' }), 3000);
  },

  // Location
  selectedProvince: 'تهران',
  selectedCity: 'تهران',
  setSelectedProvince: (p) => set({ selectedProvince: p }),
  setSelectedCity: (c) => set({ selectedCity: c }),

  // Search
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  selectedCategory: '',
  setSelectedCategory: (c) => set({ selectedCategory: c }),
}));