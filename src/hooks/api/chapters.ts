import api from '@/lib/api';
import { TApiPromise, TQueryOpts } from '@/types/api';
import { TChapter } from '@/types/Chapter';
import { useQuery } from '@tanstack/react-query';

const getChaptersBySubjectId = (subjectId: string, classId: string, freeOnly?: boolean, featureType?: string, withContent?: boolean): TApiPromise<TChapter[]> => {
  return api.get(`/api/v1/chapters`, {
    params: {
      subjectId,
      classId,
      ...(freeOnly ? { freeOnly: 'true' } : {}),
      // withContent: only chapters that have active content for this feature (any plan)
      ...(!freeOnly && withContent ? { withContent: 'true' } : {}),
      ...((freeOnly || withContent) && featureType ? { featureType } : {}),
    },
  });
};

export const useGetChaptersBySubjectId = (
  { subjectId, classId, freeOnly, featureType, withContent }: { subjectId: string; classId: string; freeOnly?: boolean; featureType?: string; withContent?: boolean },
  options?: TQueryOpts<TChapter[]>
) => {
  return useQuery({
    queryKey: ['chapters', subjectId, classId, freeOnly, featureType, withContent],
    queryFn: () => getChaptersBySubjectId(subjectId, classId, freeOnly, featureType, withContent),
    ...options,
  });
};
