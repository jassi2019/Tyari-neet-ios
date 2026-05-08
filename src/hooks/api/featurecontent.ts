import api from '@/lib/api';
import { TQueryOpts } from '@/types/api';
import { useQuery } from '@tanstack/react-query';

export type TFeatureContentItem = {
  id: string;
  title: string;
  description: string | null;
  contentURL: string | null;
  featureType: string;
  serviceType: 'PREMIUM' | 'FREE';
  sequence: number;
  isActive: boolean;
  chapterId: string;
  subjectId: string;
  classId: string;
  Chapter: { id: string; name: string; number: number };
  Subject: { id: string; name: string };
  Class: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
};

const getFeatureContents = (featureType: string, params?: Record<string, string>): Promise<any> => {
  return api.get('/api/v1/feature-content', { params: { featureType, ...params } });
};

export const useGetFeatureContents = (
  featureType: string,
  params?: Record<string, string>,
  options?: TQueryOpts<TFeatureContentItem[]>
) => {
  return useQuery({
    queryKey: ['feature-content', featureType, params],
    queryFn: () => getFeatureContents(featureType, params),
    enabled: !!featureType,
    ...options,
  });
};
