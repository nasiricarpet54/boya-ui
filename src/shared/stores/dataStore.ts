import { create } from 'zustand';

export interface DataState {
  latestBookingAlert: any | null;
  salons: any[];
  bookings: any[];
  users: any[];
  tickets: any[];
  auditLogs: any[];
  setLatestBookingAlert: (alert: any) => void;
  clearLatestBookingAlert: () => void;
  setSalons: (salons: any[]) => void;
  updateSalon: (id: string | number, patch: any) => void;
  setUsers: (users: any[]) => void;
  setTickets: (tickets: any[]) => void;
  updateBookingStatus: (id: string | number, status: string) => void;
}

export const useDataStore = create<DataState>((set) => ({
  latestBookingAlert: null,
  salons: [],
  bookings: [],
  users: [],
  tickets: [],
  auditLogs: [],
  setLatestBookingAlert: (latestBookingAlert) => set({ latestBookingAlert }),
  clearLatestBookingAlert: () => set({ latestBookingAlert: null }),
  setSalons: (salons) => set({ salons }),
  updateSalon: (id, patch) => set((state) => ({
    salons: state.salons.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  })),
  setUsers: (users) => set({ users }),
  setTickets: (tickets) => set({ tickets }),
  updateBookingStatus: (id, status) => set((state) => ({
    bookings: state.bookings.map((b) => (b.id === id ? { ...b, status } : b)),
  })),
}));
