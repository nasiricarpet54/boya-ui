import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CustomerLocationState } from '../utils/geoUtils';

interface LocationState {
  selectedProvince: string;
  selectedCity: string;
  selectedDistrict: string;
  customerLocation: CustomerLocationState;
  maxDistanceKm: number | null;
  sortByDistance: boolean;
  // CITY PRIORITY: every city the customer applies becomes their default city
  // (index 0) until they pick a new one; previously chosen cities shift down
  // as priority 2, 3, ... — newest first, max 5.
  cityPriority: string[];

  setSelectedProvince: (province: string) => void;
  setSelectedCity: (city: string) => void;
  setSelectedDistrict: (district: string) => void;
  setCustomerLocation: (location: CustomerLocationState) => void;
  setMaxDistanceKm: (distance: number | null) => void;
  setSortByDistance: (sortByDistance: boolean) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
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
      cityPriority: ['تهران'],

      setSelectedProvince: (selectedProvince) => set({ selectedProvince }),
      setSelectedCity: (selectedCity) =>
        set((state) => {
          const rest = (state.cityPriority || []).filter((c) => c !== selectedCity);
          return {
            selectedCity,
            // Promote the chosen city to the default slot and keep the rest in
            // selection order ('همه' is a filter, not a real city — never stored).
            cityPriority: selectedCity === 'همه'
              ? rest
              : [selectedCity, ...rest].slice(0, 5),
          };
        }),
      setSelectedDistrict: (selectedDistrict) => set({ selectedDistrict }),
      setCustomerLocation: (customerLocation) => set({ customerLocation }),
      setMaxDistanceKm: (maxDistanceKm) => set({ maxDistanceKm }),
      setSortByDistance: (sortByDistance) => set({ sortByDistance }),
    }),
    {
      name: 'boya-location-storage',
      // Migrate older versions that have no cityPriority yet: seed it from the
      // persisted selectedCity so the last applied city becomes the default.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!Array.isArray(state.cityPriority) || state.cityPriority.length === 0) {
          state.cityPriority = state.selectedCity && state.selectedCity !== 'همه'
            ? [state.selectedCity]
            : [];
        }
      },
    },
  ),
);
