import { useQuery } from '@tanstack/react-query';
import api from './apiClient';

export const useSalons = () => {
  return useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      const { data } = await api.get('/salons');
      return data;
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
      const { data } = await api.get('/bookings');
      return data;
    },
  });
};
