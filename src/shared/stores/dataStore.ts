import { create } from 'zustand';

interface DataState {
  latestBookingAlert: any | null;
  setLatestBookingAlert: (alert: any) => void;
  clearLatestBookingAlert: () => void;
}

export const useDataStore = create<DataState>((set) => ({
  latestBookingAlert: null,
  setLatestBookingAlert: (latestBookingAlert) => set({ latestBookingAlert }),
  clearLatestBookingAlert: () => set({ latestBookingAlert: null }),
}));
