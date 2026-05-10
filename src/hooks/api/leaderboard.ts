import api from '@/lib/api';
import { useMutation, useQuery } from '@tanstack/react-query';

export type TLeaderboardEntry = {
  rank: number;
  userId: string;
  totalScore: number;
  totalXP: number;
  testsPlayed: number;
  avgPercentage: number;
  User: { id: string; name: string; email: string; profilePicture: string | null };
};

export const useGetLeaderboard = (period?: string, subjectId?: string) => {
  return useQuery({
    queryKey: ['leaderboard', period, subjectId],
    queryFn: () => api.get('/api/v1/leaderboard', { params: { period, subjectId, limit: 20 } }),
  });
};

export const useSubmitScore = () => {
  return useMutation({
    mutationFn: (data: any) => api.post('/api/v1/leaderboard', data),
  });
};

export const useGetMyScores = () => {
  return useQuery({
    queryKey: ['my-scores'],
    queryFn: () => api.get('/api/v1/leaderboard/my'),
  });
};
