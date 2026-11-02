import { useQuery } from '@tanstack/react-query';
import api from './apiClient';
import { useDataStore } from '../stores/dataStore';

const isExplicitlyInactive = (item: any) =>
  item?.isActive === false || item?.active === false ||
  (item?.publicationStatus != null && item.publicationStatus !== 'active') ||
  (item?.status != null && item.status !== 'active');

/** The backend is authoritative; this excludes any explicitly unpublished nested records too. */
const filterPublishedSalons = (items: any[]) => items
  .filter((salon) => salon?.isApproved !== false && !isExplicitlyInactive(salon))
  .map((salon) => ({
    ...salon,
    services: (Array.isArray(salon.services) ? salon.services : []).filter(
      (service: any) => service?.isAvailable !== false && service?.available !== false && !isExplicitlyInactive(service),
    ),
    specialists: (Array.isArray(salon.specialists) ? salon.specialists : []).filter(
      (specialist: any) => specialist?.verified !== false && specialist?.isVerified !== false &&
        specialist?.isActive !== false && !isExplicitlyInactive(specialist),
    ),
  }));

export const useSalons = () => {
  return useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      const { data } = await api.get('/salons');
      if (!Array.isArray(data)) {
        throw new Error('Invalid salons response: expected an array');
      }
      const publishedSalons = filterPublishedSalons(data);
      useDataStore.getState().setSalons(publishedSalons);
      return publishedSalons;
    },
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
  });
};

export const useSalonDetail = (id: string) => {
  return useQuery({
    queryKey: ['salon', id],
    queryFn: async () => {
      const { data } = await api.get(`/salons/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useBookings = () => {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/bookings');
        if (Array.isArray(data)) {
          return data;
        }
      } catch (e) {
        // Fallback silently to local store bookings
      }
      return useDataStore.getState().bookings;
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
};
export const useStaff = () => {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data } = await api.get('/line-manager/staff');
      return data;
    },
    retry: false,
  });
};
