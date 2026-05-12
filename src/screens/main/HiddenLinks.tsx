import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ArrowRight, Lock, X } from 'lucide-react-native';
import { useGetAllSubjects } from '@/hooks/api/subjects';
import { useGetAllClasses } from '@/hooks/api/classes';
import { useGetChaptersBySubjectId } from '@/hooks/api/chapters';
import { useGetFeatureContents, TFeatureContentItem } from '@/hooks/api/featurecontent';
import { useAuth } from '@/contexts/AuthContext';
import { isPaidSubscriptionActive } from '@/lib/subscription';

type Step = 'subject' | 'chapter' | 'pages';

export const HiddenLinks = ({ navigation }: any) => {
  const [step, setStep] = useState<Step>('subject');
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [pendingSubject, setPendingSubject] = useState<any>(null);

  const { user } = useAuth();
  const hasPremium = isPaidSubscriptionActive(user?.subscription);

  // Data hooks
  const { data: subData, isLoading: subLoading } = useGetAllSubjects();
  const subjects = (subData as any)?.data || [];

  const { data: classData, isLoading: classLoading } = useGetAllClasses();
  const classes = (classData as any)?.data || [];

  const { data: chapData, isLoading: chapLoading } = useGetChaptersBySubjectId(
    { subjectId: selectedSubject?.id || '', classId: selectedClass?.id || '' },
    { enabled: !!selectedSubject?.id && !!selectedClass?.id }
  );
  const chapters = (chapData as any)?.data || [];

  const { data: contentData, isLoading: contentLoading } = useGetFeatureContents(
    'hidden_links',
    selectedChapter?.id ? { chapterId: selectedChapter.id } : undefined,
    { enabled: !!selectedChapter?.id }
  );
  const pages: TFeatureContentItem[] = (contentData as any)?.data || [];

  // Handlers
  const handleSelectSubject = (sub: any) => {
    setPendingSubject(sub);
    setShowClassModal(true);
  };

  const handleSelectClass = (cls: any) => {
    setSelectedSubject(pendingSubject);
    setSelectedClass(cls);
    setShowClassModal(false);
    setPendingSubject(null);
    setStep('chapter');
  };

  const handleSelectChapter = (ch: any) => {
    setSelectedChapter(ch);
    setStep('pages');
  };

  const openContent = (item: TFeatureContentItem) => {
    if (item.serviceType === 'PREMIUM' && !hasPremium) {
      navigation.navigate('Plans');
      return;
    }
    if (item.contentURL) {
      navigation.navigate('TopicContent', {
        topic: {
          id: item.id,
          name: item.title,
          description: item.description,
          contentURL: item.contentURL,
          serviceType: item.serviceType,
          Chapter: item.Chapter,
          Subject: item.Subject,
        },
      });
    }
  };

  const goBack = () => {
    if (step === 'pages') setStep('chapter');
    else if (step === 'chapter') setStep('subject');
    else navigation.goBack();
  };

  // ====== SUBJECT SELECTION ======
  if (step === 'subject') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <ChevronLeft size={22} color="#111" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Hidden Links</Text>
        </View>
        <Text style={s.stepTitle}>Pick a Subject</Text>
        {subLoading ? (
          <ActivityIndicator size="large" color="#F5A623" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={subjects}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }: any) => (
              <TouchableOpacity style={s.selectCard} onPress={() => handleSelectSubject(item)}>
                <Text style={{ fontSize: 24 }}>🔗</Text>
                <Text style={s.selectName}>{item.name}</Text>
                <ArrowRight size={18} color="#6D28D9" />
              </TouchableOpacity>
            )}
          />
        )}

        {/* Class Selection Popup */}
        <Modal visible={showClassModal} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Select Class</Text>
                <TouchableOpacity onPress={() => { setShowClassModal(false); setPendingSubject(null); }}>
                  <X size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <Text style={s.modalSubtitle}>
                {pendingSubject?.name || 'Subject'}
              </Text>
              {classLoading ? (
                <ActivityIndicator size="small" color="#F5A623" style={{ marginTop: 20 }} />
              ) : classes.length === 0 ? (
                <Text style={s.emptyText}>No classes available</Text>
              ) : (
                <FlatList
                  data={classes}
                  keyExtractor={(item: any) => item.id}
                  contentContainerStyle={{ gap: 8, paddingTop: 12 }}
                  renderItem={({ item }: any) => (
                    <TouchableOpacity style={s.classCard} onPress={() => handleSelectClass(item)}>
                      <View style={s.classBadge}>
                        <Text style={s.classBadgeText}>{item.name?.replace(/[^0-9]/g, '') || '•'}</Text>
                      </View>
                      <Text style={s.className}>{item.name}</Text>
                      <ArrowRight size={16} color="#6D28D9" />
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ====== CHAPTER SELECTION ======
  if (step === 'chapter') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={goBack} style={s.backBtn}>
            <ChevronLeft size={22} color="#111" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{selectedSubject?.name}</Text>
          <View style={s.classPill}>
            <Text style={s.classPillText}>{selectedClass?.name}</Text>
          </View>
        </View>
        <Text style={s.stepTitle}>Pick a Chapter</Text>
        {chapLoading ? (
          <ActivityIndicator size="large" color="#F5A623" style={{ marginTop: 40 }} />
        ) : chapters.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={{ fontSize: 48 }}>📭</Text>
            <Text style={s.emptyTitle}>No chapters found</Text>
            <Text style={s.emptyDesc}>No chapters available for this subject & class</Text>
          </View>
        ) : (
          <FlatList
            data={chapters}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }: any) => (
              <TouchableOpacity style={s.selectCard} onPress={() => handleSelectChapter(item)}>
                <View style={s.chNumBadge}>
                  <Text style={s.chNum}>{item.number}</Text>
                </View>
                <Text style={s.selectName}>{item.name}</Text>
                <ArrowRight size={18} color="#6D28D9" />
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // ====== PAGES (Feature Content) ======
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <ChevronLeft size={22} color="#111" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{selectedChapter?.name}</Text>
      </View>
      {contentLoading ? (
        <ActivityIndicator size="large" color="#F5A623" style={{ marginTop: 40 }} />
      ) : pages.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={{ fontSize: 48 }}>📝</Text>
          <Text style={s.emptyTitle}>No pages yet</Text>
          <Text style={s.emptyDesc}>Pages will appear here once added by admin</Text>
        </View>
      ) : (
        <FlatList
          data={pages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={s.pageCard} onPress={() => openContent(item)} activeOpacity={0.7}>
              <View style={s.pageLeft}>
                <View style={s.pageNumBadge}>
                  <Text style={s.pageNumText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.pageTitle} numberOfLines={2}>{item.title}</Text>
                  {item.description ? (
                    <Text style={s.pageDesc} numberOfLines={1}>{item.description}</Text>
                  ) : null}
                </View>
              </View>
              <View style={s.pageRight}>
                {item.serviceType === 'PREMIUM' && !hasPremium ? (
                  <Lock size={16} color="#6D28D9" />
                ) : null}
                <View style={[s.serviceBadge, item.serviceType === 'FREE' ? s.freeBadge : s.premBadge]}>
                  <Text style={[s.serviceText, item.serviceType === 'FREE' ? s.freeText : s.premText]}>
                    {item.serviceType}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F3FF' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#7C3AED', paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff', flex: 1 },
  classPill: {
    backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  classPillText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  stepTitle: { fontSize: 18, fontWeight: '800', color: '#111', padding: 16, paddingBottom: 8 },
  selectCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EDE9FE', gap: 12,
  },
  selectName: { fontSize: 15, fontWeight: '700', color: '#111', flex: 1 },
  chNumBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
  },
  chNum: { fontSize: 13, fontWeight: '800', color: '#fff' },

  // Class modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    width: '100%', maxHeight: '60%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  modalSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 8 },
  classCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F5F3FF', padding: 14, borderRadius: 12,
  },
  classBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
  },
  classBadgeText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  className: { fontSize: 15, fontWeight: '700', color: '#111', flex: 1 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 20 },

  // Pages
  pageCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  pageLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  pageNumBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center',
  },
  pageNumText: { fontSize: 14, fontWeight: '800', color: '#6D28D9' },
  pageTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  pageDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  pageRight: { alignItems: 'flex-end', gap: 6 },
  serviceBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  freeBadge: { backgroundColor: '#ECFDF5' },
  premBadge: { backgroundColor: '#F5F3FF' },
  serviceText: { fontSize: 10, fontWeight: '700' },
  freeText: { color: '#059669' },
  premText: { color: '#6D28D9' },

  // Empty
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#6D28D9', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 4 },
});

export default HiddenLinks;
