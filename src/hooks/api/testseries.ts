import api from '@/lib/api';
import { TApiPromise, TQueryOpts } from '@/types/api';
import { TTestSeries } from '@/types/TestSeries';
import { useQuery } from '@tanstack/react-query';

type TGetTestSeriesParams = {
  testType?: string;
};

const getTestSeriesList = (params: TGetTestSeriesParams): TApiPromise<TTestSeries[]> =>
  api.get('/api/v1/test-series', { params });

const getTestSeriesById = (id: string): TApiPromise<TTestSeries> =>
  api.get(`/api/v1/test-series/${id}`);

export const useGetTestSeriesList = (
  params: TGetTestSeriesParams,
  options?: TQueryOpts<TTestSeries[]>
) =>
  useQuery({
    queryKey: ['test-series', params.testType],
    queryFn: () => getTestSeriesList(params),
    ...options,
  });

export const useGetTestSeriesById = (
  id: string,
  options?: TQueryOpts<TTestSeries>
) =>
  useQuery({
    queryKey: ['test-series', id],
    queryFn: () => getTestSeriesById(id),
    ...options,
  });
