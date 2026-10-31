import { useQuery } from '@tanstack/react-query';
import { boyaApi } from './boyaApi';

export const useSalons = () => {
  return useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      const liveList = await boyaApi.fetchLiveSalons();
      if (!liveList?.length) return [];
      
      const detailed = await Promise.all(
        liveList.map((l) =>
          boyaApi.fetchSalonDetail(l.id).then((d) => boyaApi.adaptLiveSalon(d || (l as any)))
        )
      );
      return detailed;
    },
  });
};

export const useSalonDetail = (id: string) => {
  return useQuery({
    queryKey: ['salon', id],
    queryFn: async () => {
      const detail = await boyaApi.fetchSalonDetail(id);
      return detail ? boyaApi.adaptLiveSalon(detail) : null;
    },
    enabled: !!id,
  });
};
