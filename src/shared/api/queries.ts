import { useQuery } from '@tanstack/react-query';
import api from './apiClient';
import { useDataStore } from '../stores/dataStore';

export const useSalons = () => {
  return useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/salons');
        if (Array.isArray(data) && data.length > 0) {
          useDataStore.getState().setSalons(data);
          return data;
        }
      } catch (e) {
        console.error('Fetch salons error:', e);
      }
      return useDataStore.getState().salons;
    },
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
