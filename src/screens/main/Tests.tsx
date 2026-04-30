import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TestsScreenProps = {
  navigation: any;
};

const SUBJECTS = [
  { id: 'botany',    emoji: '🌿', label: 'SUBJECT 01', name: 'Botany',    chapters: 38, colors: ['#66BB6A', '#43A047'] as [string, string] },
  { id: 'chemistry', emoji: '⚗️', label: 'SUBJECT 02', name: 'Chemistry', chapters: 30, colors: ['#42A5F5', '#1976D2'] as [string, string] },
  { id: 'physics',   emoji: '⚛️', label: 'SUBJECT 03', name: 'Physics',   chapters: 29, colors: ['#FFB74D', '#F5A623'] as [string, string] },
  { id: 'zoology',   emoji: '🦋', label: 'SUBJECT 04', name: 'Zoology',   chapters: 34, colors: ['#EF5350', '#C62828'] as [string, string] },
];

const CLASSES = [
  { id: 'class11', label: '11', title: 'Class 11', desc: '14 chapters · 245 topics' },
  { id: 'class12', label: '12', title: 'Class 12', desc: '15 chapters · 268 topics', alt: true },
];

export const Tests = ({ navigation }: TestsScreenProps) => {
  const [selectedSubject, setSelectedSubject] = useState<typeof SUBJECTS[0] | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('class12');

  const handleSubjectPress = (subject: typeof SUBJECTS[0]) => {
    setSelectedSubject(subject);
    setSelectedClassId('class12');
  };

  const handleContinue = () => {
    if (!selectedSubject) return;
    const cls = CLASSES.find((c) => c.id === selectedClassId);
    setSelectedSubject(null);
    navigation.navigate('DailyTestChapter', {
      subjectId: selectedSubject.id,
      subjectName: selectedSubject.name,
      subjectEmoji: selectedSubject.emoji,
      classId: selectedClassId,
      className: cls?.title || 'Class 12',
    });
  };

  return (
    <LinearGradient
      colors={['#F5A623', '#F9C45A', '#FCDA3E']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.safeArea}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
        <ScrollView
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Yellow Header */}
          <View style={styles.yellowSection}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
                <ChevronLeft size={22} color="#111" />
              </TouchableOpacity>
              <Text style={styles.topTitle}>Daily Practice Test</Text>
            </View>

            {/* Step dots */}
            <View style={styles.stepDots}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>

            <View style={styles.headerPanel}>
              <Text style={styles.headerGreet}>Step 1 of 3 📚</Text>
              <Text style={styles.headerTitle}>Choose a Subject</Text>
            </View>
          </View>

          {/* Body */}
          <View style={styles.bodyCard}>
            <View style={styles.subjectsGrid}>
              {SUBJECTS.map((subject) => {
                const isHighlighted = selectedSubject?.id === subject.id;
                return (
                  <TouchableOpacity
                    key={subject.id}
                    style={[styles.subjectCard, isHighlighted && styles.subjectCardHighlight]}
                    activeOpacity={0.85}
                    onPress={() => handleSubjectPress(subject)}
                  >
                    <LinearGradient
                      colors={subject.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.subIcon}
                    >
                      <Text style={styles.subEmoji}>{subject.emoji}</Text>
                    </LinearGradient>
                    <Text style={styles.subLabel}>{subject.label}</Text>
                    <Text style={styles.subName}>{subject.name}</Text>
                    <View style={styles.subMeta}>
                      <Text style={styles.subChapters}>
                        <Text style={styles.subChaptersBold}>{subject.chapters}</Text> chapters
                      </Text>
                      <View style={styles.subArrow}>
                        <Text style={styles.subArrowText}>→</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Class Select Bottom Sheet Modal */}
        <Modal
          animationType="slide"
          transparent
          visible={!!selectedSubject}
          onRequestClose={() => setSelectedSubject(null)}
        >
          <TouchableWithoutFeedback onPress={() => setSelectedSubject(null)}>
            <View style={styles.modalBackdrop}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalSheet}>
                  <View style={styles.modalGrip} />

                  {/* Subject badge */}
                  <View style={styles.subjectBadgeWrap}>
                    <View style={styles.subjectBadge}>
                      <Text style={styles.subjectBadgeText}>
                        {selectedSubject?.emoji} {selectedSubject?.name?.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.modalTitle}>Select Your Class</Text>
                  <Text style={styles.modalSub}>Pick the class to load relevant chapters</Text>

                  <View style={styles.classOptions}>
                    {CLASSES.map((cls) => {
                      const isSelected = selectedClassId === cls.id;
                      return (
                        <TouchableOpacity
                          key={cls.id}
                          style={[styles.classCard, isSelected && styles.classCardSelected]}
                          activeOpacity={0.85}
                          onPress={() => setSelectedClassId(cls.id)}
                        >
                          <LinearGradient
                            colors={cls.alt ? ['#42A5F5', '#1976D2'] : ['#F6C228', '#FFB74D']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.classIcon}
                          >
                            <Text style={styles.classIconText}>{cls.label}</Text>
                          </LinearGradient>
                          <View style={styles.classTextWrap}>
                            <Text style={styles.classTitle}>{cls.title}</Text>
                            <Text style={styles.classDesc}>{cls.desc}</Text>
                          </View>
                          <View style={[styles.classRadio, isSelected && styles.classRadioSelected]}>
                            {isSelected && <Text style={styles.classRadioCheck}>✓</Text>}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity style={styles.modalCta} onPress={handleContinue} activeOpacity={0.85}>
                    <Text style={styles.modalCtaText}>CONTINUE →</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingBottom: 120, backgroundColor: '#FFF8E8' },

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
  topTitle: { fontSize: 17, fontWeight: '800', color: '#111' },

  stepDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  dot: { width: 22, height: 4, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.2)' },
  dotActive: { backgroundColor: '#111' },
  dotDone: { backgroundColor: '#fff' },

  headerPanel: { paddingHorizontal: 20, paddingBottom: 28, paddingTop: 4 },
  headerGreet: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#111', letterSpacing: -0.3 },

  bodyCard: {
    backgroundColor: '#FFF8E8',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 16, paddingTop: 22, paddingBottom: 24,
  },

  subjectsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  subjectCard: {
    flexBasis: '47%', flexGrow: 1,
    backgroundColor: '#fff', borderRadius: 22, padding: 16,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 2,
  },
  subjectCardHighlight: {
    borderColor: '#F6C228',
    shadowColor: '#F6C228', shadowOpacity: 0.35, shadowRadius: 20,
    elevation: 4,
  },
  subIcon: {
    width: 50, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  subEmoji: { fontSize: 26 },
  subLabel: { fontSize: 9.5, fontWeight: '700', color: '#888', letterSpacing: 0.5, marginBottom: 2 },
  subName: { fontSize: 17, fontWeight: '900', color: '#111', marginBottom: 8 },
  subMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subChapters: { fontSize: 11, color: '#666', fontWeight: '600' },
  subChaptersBold: { color: '#111', fontWeight: '800' },
  subArrow: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#F6C228', alignItems: 'center', justifyContent: 'center',
  },
  subArrowText: { color: '#fff', fontSize: 13, fontWeight: '900' },

  // Modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF8E8', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 18, paddingTop: 22, paddingBottom: 30,
  },
  modalGrip: {
    width: 40, height: 4, borderRadius: 4,
    backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 16,
  },
  subjectBadgeWrap: { alignItems: 'center', marginBottom: 12 },
  subjectBadge: {
    backgroundColor: '#FFF8E1', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  subjectBadgeText: { fontSize: 11, fontWeight: '800', color: '#b8860b' },
  modalTitle: { fontSize: 19, fontWeight: '900', color: '#111', textAlign: 'center', marginBottom: 4 },
  modalSub: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 20 },

  classOptions: { gap: 12, marginBottom: 18 },
  classCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  classCardSelected: {
    borderColor: '#F6C228', backgroundColor: '#FFFBEA',
    shadowColor: '#F6C228', shadowOpacity: 0.3, shadowRadius: 18,
  },
  classIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  classIconText: { fontSize: 18, fontWeight: '900', color: '#fff' },
  classTextWrap: { flex: 1 },
  classTitle: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 2 },
  classDesc: { fontSize: 11, color: '#777' },
  classRadio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#ddd',
    alignItems: 'center', justifyContent: 'center',
  },
  classRadioSelected: { backgroundColor: '#F6C228', borderColor: '#F6C228' },
  classRadioCheck: { fontSize: 12, fontWeight: '900', color: '#fff' },

  modalCta: {
    backgroundColor: '#111', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  modalCtaText: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
});

export default Tests;
