import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
  savedSalonIds: (string | number)[];
  toggleFavorite: (salonId: string | number) => boolean;
  isFavorite: (salonId: string | number) => boolean;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      savedSalonIds: [1, 2], // Default sample IDs matching DB seed salon IDs
      toggleFavorite: (salonId) => {
        const current = get().savedSalonIds;
        const exists = current.some((id) => String(id) === String(salonId));
        if (exists) {
          set({ savedSalonIds: current.filter((id) => String(id) !== String(salonId)) });
          return false;
        } else {
          set({ savedSalonIds: [...current, salonId] });
          return true;
        }
      },
      isFavorite: (salonId) => {
        return get().savedSalonIds.some((id) => String(id) === String(salonId));
      },
      clearFavorites: () => set({ savedSalonIds: [] }),
    }),
    {
      name: 'boya-favorites-store',
    }
  )
);
