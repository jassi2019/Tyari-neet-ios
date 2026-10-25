import { useGetTestSeriesList } from '@/hooks/api/testseries';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BrandLoader from '@/components/BrandLoader';
import { compareTests, formatUnlock, isTestLocked, serverOffsetMs } from '@/lib/testUnlock';
type Props = {
  navigation: any;
  route: {
    params?: {
      testType?: string;
      testTypeTitle?: string;
      testTypeEmoji?: string;
      testTypeAccent?: string;
    };
  };
};

export const TestSeriesList = ({ navigation, route }: Props) => {
  const testType = route?.params?.testType || 'daily';
  const testTypeTitle = route?.params?.testTypeTitle || 'Practice Tests';
  const testTypeEmoji = route?.params?.testTypeEmoji || '📝';
  const accent = route?.params?.testTypeAccent || '#F5A623';

  // Public endpoint — guests can browse too; FREE tests open for everyone,
  // PREMIUM ones are gated in TestSeriesDetail.
  const { data, isLoading } = useGetTestSeriesList({ testType });

  const tests = [...(data?.data || [])].sort(compareTests);
  // Locks are judged on server time; re-render each 30s so a test opens on time.
  const offsetMs = serverOffsetMs((data as any)?.serverTime);
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);
  const openCount = tests.filter((t) => !isTestLocked(t as any, offsetMs)).length;

  return (
    <LinearGradient
      colors={['#F5A623', '#F9C45A', '#FCDA3E']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.safeArea}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
        {/* Header */}
        <View style={s.yellowSection}>
          <View style={s.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
              <ChevronLeft size={22} color="#111" />
            </TouchableOpacity>
            <Text style={s.topTitle}>{testTypeTitle}</Text>
          </View>
          <View style={s.headerPanel}>
            <Text style={s.headerEmoji}>{testTypeEmoji}</Text>
            <Text style={s.headerTitle}>Select a Test</Text>
            <Text style={s.headerSub}>
              {openCount < tests.length ? `${tests.length} tests · ${openCount} khule, baaki roz unlock honge` : `${tests.length} tests available`}
            </Text>
          </View>
        </View>

        {/* Body */}
        <View style={s.bodyCard}>
          {isLoading ? (
            <View style={s.loadingWrap}>
              <BrandLoader />
              <Text style={s.loadingText}>Loading tests...</Text>
            </View>
          ) : tests.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyEmoji}>📋</Text>
              <Text style={s.emptyTitle}>No Tests Yet</Text>
              <Text style={s.emptyText}>Tests for this category will appear here once available.</Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.testList}
            >
              {tests.map((test, idx) => {
                const locked = isTestLocked(test as any, offsetMs);
                const when = formatUnlock((test as any).unlockAt);
                return (
                <TouchableOpacity
                  key={test.id}
                  style={[s.testCard, locked && { opacity: 0.6 }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (locked) {
                      Alert.alert('🔒 Abhi locked hai', `"${test.name}" ${when} par khulega. Roz naya test unlock hota hai, tab tak pichhle tests practice karo!`);
                      return;
                    }
                    navigation.navigate('TestSeriesDetail', {
                      testSeriesId: test.id,
                      testName: test.name,
                      testTypeTitle,
                      accent,
                    });
                  }}
                >
                  <LinearGradient
                    colors={locked ? ['#BDBDBD', '#9E9E9E'] : ['#FFB74D', '#F6C228']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.testNum}
                  >
                    <Text style={s.testNumText}>{String(idx + 1).padStart(2, '0')}</Text>
                  </LinearGradient>
                  <View style={s.testText}>
                    <Text style={s.testName} numberOfLines={1}>{test.name}</Text>
                    <View style={s.testMeta}>
                      <Text style={s.testMetaText}>📝 {test.questionCount || 0} Questions</Text>
                      <Text style={s.testMetaText}>⏱ {Math.round((test.timeLimit || 1800) / 60)} min</Text>
                      <Text style={s.testMetaText}>{(test as any).serviceType === 'FREE' ? '✓ FREE' : '🔒 PREMIUM'}</Text>
                    </View>
                    {locked && when ? <Text style={s.unlockText}>🔓 Khulega: {when}</Text> : null}
                  </View>
                  <View style={s.testArrow}>
                    <Text style={s.testArrowText}>{locked ? '🔒' : '→'}</Text>
                  </View>
                </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const s = StyleSheet.create({
  safeArea: { flex: 1 },
  yellowSection: { backgroundColor: 'transparent' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(146,64,14,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#111', flex: 1 },
  headerPanel: { alignItems: 'center', paddingBottom: 28, paddingTop: 8 },
  headerEmoji: { fontSize: 36, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#111', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 4 },

  bodyCard: {
    flex: 1,
    backgroundColor: '#FFF8E8',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 16, paddingTop: 22,
  },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { fontSize: 13, color: '#999', marginTop: 12 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center', paddingHorizontal: 30 },

  testList: { gap: 10, paddingBottom: 30 },
  testCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  testNum: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  testNumText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  testText: { flex: 1, minWidth: 0 },
  testName: { fontSize: 14, fontWeight: '800', color: '#111', marginBottom: 4 },
  testMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  testMetaText: { fontSize: 11, color: '#666', fontWeight: '600' },
  unlockText: { fontSize: 11, color: '#B26A00', fontWeight: '700', marginTop: 4 },
  testArrow: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#F6C228', alignItems: 'center', justifyContent: 'center',
  },
  testArrowText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});

export default TestSeriesList;
