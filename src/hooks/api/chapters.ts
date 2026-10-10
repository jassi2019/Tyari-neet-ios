import api from '@/lib/api';
import { TApiPromise, TQueryOpts } from '@/types/api';
import { TChapter } from '@/types/Chapter';
import { useQuery } from '@tanstack/react-query';

const getChaptersBySubjectId = (subjectId: string, classId: string, freeOnly?: boolean, featureType?: string): TApiPromise<TChapter[]> => {
  return api.get(`/api/v1/chapters`, {
    params: {
      subjectId,
      classId,
      ...(freeOnly ? { freeOnly: 'true' } : {}),
      ...(freeOnly && featureType ? { featureType } : {}),
    },
  });
};

export const useGetChaptersBySubjectId = (
  { subjectId, classId, freeOnly, featureType }: { subjectId: string; classId: string; freeOnly?: boolean; featureType?: string },
  options?: TQueryOpts<TChapter[]>
) => {
  return useQuery({
    queryKey: ['chapters', subjectId, classId, freeOnly, featureType],
    queryFn: () => getChaptersBySubjectId(subjectId, classId, freeOnly, featureType),
    ...options,
  });
};
