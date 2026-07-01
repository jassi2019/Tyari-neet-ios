import { useGetTestSeriesById } from '@/hooks/api/testseries';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  navigation: any;
  route: {
    params?: {
      testSeriesId?: string;
      testName?: string;
      testTypeTitle?: string;
      accent?: string;
    };
  };
};

export const TestSeriesDetail = ({ navigation, route }: Props) => {
  const testSeriesId = route?.params?.testSeriesId || '';
  const testName = route?.params?.testName || 'Test';
  const accent = route?.params?.accent || '#F5A623';

  const { data, isLoading } = useGetTestSeriesById(testSeriesId, {
    enabled: Boolean(testSeriesId),
  });

  const test = data?.data;
  const questions = test?.Questions || [];
  const timeMinutes = Math.round((test?.timeLimit || 1800) / 60);

  // Extract unique chapters/subjects from questions for syllabus display
  const syllabusMap = new Map<string, { chapterName: string; subjectName: string }>();
  questions.forEach((q: any) => {
    const chId = q.Chapter?.id || q.chapterId;
    if (chId && !syllabusMap.has(chId)) {
      syllabusMap.set(chId, {
        chapterName: q.Chapter?.name || 'Chapter',
        subjectName: q.Subject?.name || 'Subject',
      });
    }
  });
  const syllabus = Array.from(syllabusMap.values());

  const handleStartTest = () => {
    if (!test || questions.length === 0) return;
    navigation.navigate('TestMCQ', {
      testName: test.name,
      subjectName: '',
      subjectEmoji: '📝',
      subjectId: '',
      classId: '',
      chapterId: '',
      chapterName: test.name,
      chapterNum: '',
      totalTime: test.timeLimit || 1800,
      testSeriesId: test.id,
    });
  };

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
            <Text style={s.topTitle} numberOfLines={1}>{testName}</Text>
          </View>
        </View>

        {/* Body */}
        <View style={s.bodyCard}>
          {isLoading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color="#F5A623" />
              <Text style={s.loadingText}>Loading test details...</Text>
            </View>
          ) : !test ? (
            <View style={s.loadingWrap}>
              <Text style={s.emptyText}>Test not found</Text>
            </View>
          ) : (
            <>
              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scroll}
              >
                {/* Test Info Card */}
                <View style={s.infoCard}>
                  <Text style={s.infoTitle}>{test.name}</Text>
                  {test.description ? (
                    <Text style={s.infoDesc}>{test.description}</Text>
                  ) : null}
                  <View style={s.infoRow}>
                    <View style={s.infoBadge}>
                      <Text style={s.infoBadgeText}>📝 {questions.length} Questions</Text>
                    </View>
                    <View style={s.infoBadge}>
                      <Text style={s.infoBadgeText}>⏱ {timeMinutes} min</Text>
                    </View>
                    {test.totalMarks ? (
                      <View style={s.infoBadge}>
                        <Text style={s.infoBadgeText}>🏆 {test.totalMarks} marks</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Syllabus */}
                {syllabus.length > 0 && (
                  <View style={s.syllabusCard}>
                    <Text style={s.syllabusTitle}>Topics Covered</Text>
                    {syllabus.map((item, idx) => (
                      <View key={idx} style={s.syllabusItem}>
                        <View style={s.syllabusNum}>
                          <Text style={s.syllabusNumText}>{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.syllabusChapter} numberOfLines={1}>{item.chapterName}</Text>
                          <Text style={s.syllabusSubject}>{item.subjectName}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Instructions */}
                <View style={s.instructionCard}>
                  <Text style={s.instructionTitle}>Instructions</Text>
                  <Text style={s.instructionText}>• Each correct answer: +4 marks</Text>
                  <Text style={s.instructionText}>• Each wrong answer: -1 mark</Text>
                  <Text style={s.instructionText}>• Unanswered questions: 0 marks</Text>
                  <Text style={s.instructionText}>• Time limit: {timeMinutes} minutes</Text>
                </View>
              </ScrollView>

              {/* Start Test Button */}
              <View style={s.startBar}>
                <TouchableOpacity
                  style={[s.startBtn, questions.length === 0 && s.startBtnDisabled]}
                  activeOpacity={questions.length > 0 ? 0.85 : 1}
                  onPress={handleStartTest}
                >
                  <Text style={s.startBtnText}>
                    {questions.length > 0 ? 'START TEST' : 'No questions available'}
                  </Text>
                  {questions.length > 0 && (
                    <View style={s.startArrow}>
                      <Text style={s.startArrowText}>→</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </>
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
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(146,64,14,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#111', flex: 1 },

  bodyCard: {
    flex: 1,
    backgroundColor: '#FFF8E8',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -10,
    paddingHorizontal: 16, paddingTop: 22,
  },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 13, color: '#999', marginTop: 12 },
  emptyText: { fontSize: 14, color: '#999' },

  scroll: { gap: 14, paddingBottom: 10 },

  infoCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  infoTitle: { fontSize: 20, fontWeight: '900', color: '#111', marginBottom: 6 },
  infoDesc: { fontSize: 13, color: '#555', lineHeight: 20, marginBottom: 12 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoBadge: {
    backgroundColor: '#FFF8E1', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
  },
  infoBadgeText: { fontSize: 12, fontWeight: '700', color: '#92400E' },

  syllabusCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  syllabusTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 12 },
  syllabusItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10,
  },
  syllabusNum: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#FFF8E1', alignItems: 'center', justifyContent: 'center',
  },
  syllabusNumText: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  syllabusChapter: { fontSize: 13, fontWeight: '700', color: '#111' },
  syllabusSubject: { fontSize: 11, color: '#888' },

  instructionCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  instructionTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 10 },
  instructionText: { fontSize: 13, color: '#555', lineHeight: 22 },

  startBar: {
    paddingVertical: 12, paddingBottom: 18,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)',
  },
  startBtn: {
    backgroundColor: '#1a1a1a', borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  startBtnDisabled: { backgroundColor: '#ccc' },
  startBtnText: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  startArrow: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#F6C228', alignItems: 'center', justifyContent: 'center',
  },
  startArrowText: { color: '#111', fontSize: 13, fontWeight: '900' },
});

export default TestSeriesDetail;
