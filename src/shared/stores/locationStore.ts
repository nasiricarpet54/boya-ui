import { create } from 'zustand';
import { CustomerLocationState } from '../utils/geoUtils';

interface LocationState {
  selectedProvince: string;
  selectedCity: string;
  selectedDistrict: string;
  customerLocation: CustomerLocationState;
  maxDistanceKm: number | null;
  sortByDistance: boolean;

  setSelectedProvince: (province: string) => void;
  setSelectedCity: (city: string) => void;
  setSelectedDistrict: (district: string) => void;
  setCustomerLocation: (location: CustomerLocationState) => void;
  setMaxDistanceKm: (distance: number | null) => void;
  setSortByDistance: (sortBy: boolean) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  selectedProvince: 'تهران',
  selectedCity: 'تهران',
  selectedDistrict: 'همه',
  customerLocation: {
    coords: { lat: 35.7951, lng: 51.4239 },
    status: 'simulated',
    source: 'preset',
    label: 'موقعیت آزمایشی: تهران (الهیه)',
  },
  maxDistanceKm: null,
  sortByDistance: true,

  setSelectedProvince: (selectedProvince) => set({ selectedProvince }),
  setSelectedCity: (selectedCity) => set({ selectedCity }),
  setSelectedDistrict: (selectedDistrict) => set({ selectedDistrict }),
  setCustomerLocation: (customerLocation) => set({ customerLocation }),
  setMaxDistanceKm: (maxDistanceKm) => set({ maxDistanceKm }),
  setSortByDistance: (sortByDistance) => set({ sortByDistance }),
}));
