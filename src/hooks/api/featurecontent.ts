import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type TFeatureContent = {
  id: string;
  title: string;
  description: string;
  contentURL: string;
  featureType: string;
  serviceType: string;
  contentType?: 'canva_only' | 'mcq_only' | 'both';
  sequence: number;
  isActive: boolean;
  chapterId: string;
  subjectId: string;
  classId: string;
  Chapter?: { id: string; name: string; number: number } | null;
  Subject?: { id: string; name: string } | null;
  Class?: { id: string; name: string } | null;
};

type Params = {
  featureType?: string;
  subjectId?: string;
  classId?: string;
  chapterId?: string;
};

export const useGetFeatureContent = (params: Params, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['feature-content', params],
    queryFn: () => api.get<{ data: TFeatureContent[] }>('/api/v1/feature-content', { params }),
    enabled: Boolean(options?.enabled ?? true),
    staleTime: 10 * 1000,
    refetchOnMount: true,
  });
