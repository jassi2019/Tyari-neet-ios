import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export const useGetHomeContent = (section?: string) => {
  return useQuery({
    queryKey: ['home-content', section],
    queryFn: async () => {
      const params = section ? `?section=${section}` : '';
      const res = await api.get(`/api/v1/home-content${params}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // cache 5 min
  });
};
