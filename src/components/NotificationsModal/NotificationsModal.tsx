import { Bell, X } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useGetNotifications, useMarkNotificationRead, TNotification } from '@/hooks/api/notifications';

type Props = { visible: boolean; onClose: () => void; };

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + 'd ago';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const NotificationsModal = ({ visible, onClose }: Props) => {
  const { data, isLoading } = useGetNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const notifications: TNotification[] = (data as any)?.data?.notifications || [];
  const unreadCount: number = (data as any)?.data?.unreadCount || 0;

  const handlePress = (n: TNotification) => {
    if (!n.isRead) markRead(n.id);
  };

  return (
    <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={s.sheet}>
              <View style={s.header}>
                <View style={s.headerLeft}>
                  <Bell size={20} color='#111' />
                  <Text style={s.title}>Notifications</Text>
                  {unreadCount > 0 && <View style={s.badge}><Text style={s.badgeText}>{unreadCount}</Text></View>}
                </View>
                <TouchableOpacity onPress={onClose} style={s.closeBtn}><X size={20} color='#666' /></TouchableOpacity>
              </View>
              {isLoading ? (
                <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator size='large' color='#F5A623' /></View>
              ) : notifications.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ fontSize: 40, marginBottom: 8 }}>{'\ud83d\udd14'}</Text><Text style={{ color: '#999', fontSize: 14 }}>No notifications yet</Text></View>
              ) : (
                <ScrollView style={s.list} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                  {notifications.map((n) => (
                    <TouchableOpacity key={n.id} style={[s.item, !n.isRead && s.itemUnread]} activeOpacity={0.8} onPress={() => handlePress(n)}>
                      <View style={s.iconWrap}><Text style={{ fontSize: 22 }}>{n.icon === 'bell' ? '\ud83d\udd14' : n.icon}</Text></View>
                      <View style={{ flex: 1 }}>
                        <View style={s.itemTopRow}><Text style={s.itemTitle}>{n.title}</Text>{!n.isRead && <View style={s.dot} />}</View>
                        <Text style={s.itemMsg}>{n.message}</Text>
                        <Text style={s.itemTime}>{timeAgo(n.createdAt)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '800', color: '#111' },
  badge: { backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f3f3', alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 10 },
  item: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: '#fafafa' },
  itemUnread: { backgroundColor: '#FFF8E1' },
  iconWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#111', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  itemMsg: { fontSize: 12, color: '#555', lineHeight: 16, marginBottom: 4 },
  itemTime: { fontSize: 10, color: '#999', fontWeight: '600' },
});

export default NotificationsModal;