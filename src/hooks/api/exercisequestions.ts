import api from '@/lib/api';
import { TApiPromise, TQueryOpts } from '@/types/api';
import { useQuery } from '@tanstack/react-query';

export type TExerciseQuestion = {
  id: string;
  questionNumber: string;
  questionText: string;
  explanationURL: string | null;
  featureType: string;
  sequence: number;
  isActive: boolean;
  chapterId: string;
  subjectId: string;
  classId: string;
  Chapter?: { id: string; name: string; number: number } | null;
  Subject?: { id: string; name: string } | null;
  Class?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

type Params = {
  chapterId?: string;
  subjectId?: string;
  classId?: string;
  featureType?: string;
};

const getExerciseQuestions = (params: Params): TApiPromise<TExerciseQuestion[]> =>
  api.get('/api/v1/exercise-questions', { params });

export const useGetExerciseQuestions = (
  params: Params,
  options?: TQueryOpts<TExerciseQuestion[]>
) =>
  useQuery({
    queryKey: ['exercise-questions', params.chapterId, params.featureType],
    queryFn: () => getExerciseQuestions(params),
    ...options,
  });
