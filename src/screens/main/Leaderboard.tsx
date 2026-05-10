import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Trophy, Medal } from 'lucide-react-native';
import { useGetLeaderboard, TLeaderboardEntry } from '@/hooks/api/leaderboard';

const PERIODS = [{ id: 'daily', label: 'Today' }, { id: 'weekly', label: 'This Week' }, { id: 'all', label: 'All Time' }];

export const Leaderboard = ({ navigation }: any) => {
  const [period, setPeriod] = useState('weekly');
  const { data, isLoading } = useGetLeaderboard(period);
  const entries: TLeaderboardEntry[] = (data as any)?.data || [];

  const getMedal = (rank: number) => {
    if (rank === 1) return { emoji: '\ud83e\udd47', color: '#FFD700' };
    if (rank === 2) return { emoji: '\ud83e\udd48', color: '#C0C0C0' };
    if (rank === 3) return { emoji: '\ud83e\udd49', color: '#CD7F32' };
    return null;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8E8' }} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><ChevronLeft size={22} color='#111' /></TouchableOpacity>
        <Trophy size={20} color='#F5A623' />
        <Text style={s.headerTitle}>Leaderboard</Text>
      </View>

      <View style={s.tabs}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p.id} style={[s.tab, period === p.id && s.tabActive]} onPress={() => setPeriod(p.id)}>
            <Text style={[s.tabText, period === p.id && s.tabTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size='large' color='#F5A623' /></View>
      ) : entries.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 48, marginBottom: 8 }}>\ud83c\udfc6</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#92400E' }}>No scores yet</Text>
          <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4 }}>Take a test to appear on the leaderboard!</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const medal = getMedal(item.rank);
            return (
              <View style={[s.card, item.rank <= 3 && s.cardTop]}>
                <View style={[s.rankBadge, medal ? { backgroundColor: medal.color } : {}]}>
                  <Text style={s.rankText}>{medal ? medal.emoji : item.rank}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{item.User?.name || 'Student'}</Text>
                  <Text style={s.stats}>{Math.round(item.avgPercentage || 0)}% avg  \u00b7  {item.testsPlayed} tests</Text>
                </View>
                <View style={s.scoreArea}>
                  <Text style={s.score}>{Math.round(item.totalXP || 0)}</Text>
                  <Text style={s.scoreLabel}>XP</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F5A623', paddingHorizontal: 18, paddingVertical: 12 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(146,64,14,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#111' },
  tabs: { flexDirection: 'row', padding: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f0f0f0', alignItems: 'center' },
  tabActive: { backgroundColor: '#92400E' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#666' },
  tabTextActive: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  cardTop: { borderWidth: 1, borderColor: '#F5A623' },
  rankBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 16, fontWeight: '900', color: '#333' },
  name: { fontSize: 14, fontWeight: '700', color: '#111' },
  stats: { fontSize: 11, color: '#888', marginTop: 2 },
  scoreArea: { alignItems: 'center' },
  score: { fontSize: 18, fontWeight: '900', color: '#F5A623' },
  scoreLabel: { fontSize: 9, fontWeight: '700', color: '#999' },
});

export default Leaderboard;