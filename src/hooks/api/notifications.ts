import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type TNotification = {
  id: string;
  title: string;
  message: string;
  icon: string;
  targetScreen: string | null;
  targetId: string | null;
  isGlobal: boolean;
  isRead: boolean;
  createdAt: string;
};

const getNotifications = () => api.get('/api/v1/notifications');
const markAsRead = (id: string) => api.put(`/api/v1/notifications/${id}/read`);

export const useGetNotifications = () => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 60000,
  });
};

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};
