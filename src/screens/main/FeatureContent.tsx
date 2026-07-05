import { useAuth } from '@/contexts/AuthContext';
import { useGetAllSubjects } from '@/hooks/api/subjects';
import { useGetAllClasses } from '@/hooks/api/classes';
import { useGetChaptersBySubjectId } from '@/hooks/api/chapters';
import { useGetFeatureContent, TFeatureContent } from '@/hooks/api/featurecontent';
import { useGetExerciseQuestions, TExerciseQuestion } from '@/hooks/api/exercisequestions';
import { useGetQuestions } from '@/hooks/api/questions';
import { useContentProtection } from '@/hooks/useContentProtection';
import { isPaidSubscriptionActive, isPremiumServiceType } from '@/lib/subscription';
import PlatformWebView from '@/components/PlatformWebView';
import { TChapter } from '@/types/Chapter';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, FileText, ExternalLink } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  navigation: any;
  route: {
    params?: {
      featureType?: string;
      featureName?: string;
      preSelectedSubjectId?: string;
      preSelectedClassId?: string;
      preSelectedChapterId?: string;
      preSelectedChapterName?: string;
    };
  };
};

type Step = 'subject' | 'chapter' | 'content' | 'viewer' | 'exerciseList';

// Features that show exercise question list instead of question type modal
const EXERCISE_LIST_FEATURES = ['exercise_revival', 'master_exemplar', 'pyq'];

const SUBJECT_EMOJI: Record<string, string> = {
  botany: '🌿', chemistry: '⚗️', physics: '⚛️', zoology: '🦋',
};

// Feature types that use questions table instead of feature_contents
const QUESTION_FEATURES = ['revision_recall', 'exercise_revival', 'master_exemplar', 'pyq', 'chapter_checkpoint'];

export const FeatureContent = ({ navigation, route }: Props) => {
  const featureType = route?.params?.featureType || 'explanation';
  const featureName = route?.params?.featureName || 'Content';
  const isQuestionBased = QUESTION_FEATURES.includes(featureType);
  const { isGuest, user } = useAuth();
  const hasPremium = isPaidSubscriptionActive(user?.subscription);
  // Content protection only when viewing PDF content, not on navigation screens


  const [step, setStep] = useState<Step>('subject');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showQuestionTypeModal, setShowQuestionTypeModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [pendingChapter, setPendingChapter] = useState<any>(null);
  const [viewerItem, setViewerItem] = useState<TFeatureContent | null>(null);
  const [selectedExerciseQ, setSelectedExerciseQ] = useState<TExerciseQuestion | null>(null);
  const [showExercisePopup, setShowExercisePopup] = useState(false);
  const isExerciseListFeature = EXERCISE_LIST_FEATURES.includes(featureType);

  // Pre-selected params (from Revision Recall → Explanation flow)
  const preSubjectId = route?.params?.preSelectedSubjectId;
  const preClassId = route?.params?.preSelectedClassId;
  const preChapterId = route?.params?.preSelectedChapterId;
  const preChapterName = route?.params?.preSelectedChapterName;

  const { data: subjectsData } = useGetAllSubjects({ enabled: !isGuest });
  const { data: classesData } = useGetAllClasses({ enabled: !isGuest });
  const { data: chaptersData, isLoading: chaptersLoading } = useGetChaptersBySubjectId(
    { subjectId: selectedSubject?.id, classId: selectedClass?.id },
    { enabled: !!selectedSubject && !!selectedClass }
  );
  const { data: contentData, isLoading: contentLoading } = useGetFeatureContent(
    { featureType, chapterId: selectedChapter?.id },
    { enabled: !!selectedChapter }
  );

  // Fetch exercise questions from exercise_questions table
  const { data: exerciseQData, isLoading: exerciseQLoading } = useGetExerciseQuestions(
    { chapterId: selectedChapter?.id, featureType },
    { enabled: isExerciseListFeature && !!selectedChapter && step === 'exerciseList' }
  );

  // Also fetch from main questions table as fallback
  const { data: mainQData, isLoading: mainQLoading } = useGetQuestions(
    { chapterId: selectedChapter?.id, subjectId: selectedSubject?.id, classId: selectedClass?.id, featureType },
    { enabled: isExerciseListFeature && !!selectedChapter && step === 'exerciseList' }
  );

  const subjects = subjectsData?.data || [];
  const classes = classesData?.data || [];
  const chapters: TChapter[] = chaptersData?.data || [];
  const contents: TFeatureContent[] = (contentData as any)?.data || [];
  // Merge exercise_questions + questions table data
  const exerciseQFromTable: TExerciseQuestion[] = exerciseQData?.data || [];
  const mainQuestions = mainQData?.data || [];
  // Convert main questions to exercise question format
  const mainQAsExercise: TExerciseQuestion[] = mainQuestions.map((q: any) => ({
    id: q.id,
    questionNumber: String(q.sequence || ''),
    questionText: q.text,
    explanationURL: q.canvaExplanationURL || null,
    featureType: featureType,
    sequence: q.sequence || 1,
    isActive: true,
    chapterId: q.chapterId,
    subjectId: q.subjectId,
    classId: q.classId,
  }));
  // Combine both, deduplicate by id
  const allExerciseIds = new Set(exerciseQFromTable.map(q => q.id));
  const exerciseQuestions: TExerciseQuestion[] = [
    ...exerciseQFromTable,
    ...mainQAsExercise.filter(q => !allExerciseIds.has(q.id)),
  ];
  const isExerciseLoading = exerciseQLoading || mainQLoading;

  // Auto-skip to content step when pre-selected params are provided (Revision Recall → Explanation)
  const didAutoSkip = useRef(false);
  useEffect(() => {
    if (didAutoSkip.current || !preSubjectId || !preClassId || !preChapterId) return;
    if (subjects.length === 0 || classes.length === 0) return;
    const sub = subjects.find((s: any) => s.id === preSubjectId);
    const cls = classes.find((c: any) => c.id === preClassId);
    if (!sub || !cls) return;
    didAutoSkip.current = true;
    setSelectedSubject(sub);
    setSelectedClass(cls);
    setSelectedChapter({ id: preChapterId, name: preChapterName || 'Chapter' });
    setStep('content');
  }, [preSubjectId, preClassId, preChapterId, preChapterName, subjects, classes]);

  const handleSubjectPress = (sub: any) => {
    setSelectedSubject(sub);
    setShowClassModal(true);
  };
  const handleClassSelect = (cls: any) => {
    setSelectedClass(cls);
    setShowClassModal(false);
    setStep('chapter');
  };
  const handleChapterPress = (ch: any) => {
    if (isQuestionBased) {
      if (featureType === 'revision_recall' || featureType === 'chapter_checkpoint') {
        // Revision Recall & Chapter Checkpoint — directly open MCQ, no popup
        const displayName = featureType === 'revision_recall' ? 'Revision Recall' : 'Chapter Check Point';
        navigation.navigate('TestMCQ', {
          testName: `${displayName} · ${selectedSubject?.name}`,
          subjectName: selectedSubject?.name || 'Subject',
          subjectEmoji: SUBJECT_EMOJI[selectedSubject?.name?.trim().toLowerCase()] || '📘',
          subjectId: selectedSubject?.id || '',
          classId: selectedClass?.id || '',
          chapterId: ch.id,
          chapterName: ch.name,
          chapterNum: String(ch.number).padStart(2, '0'),
          totalTime: 30 * 60,
          featureType,
          questionType: 'MCQ',
        });
      } else if (isExerciseListFeature) {
        // Exercise Revival, Exemplar, PYQ — show exercise questions list
        setSelectedChapter(ch);
        setStep('exerciseList');
      } else {
        // Other question-based features — show question type modal
        setPendingChapter(ch);
        setShowQuestionTypeModal(true);
      }
    } else if (featureType === 'explanation') {
      // Explanation — show Explanation / Practice MCQ popup
      setPendingChapter(ch);
      setShowRevisionModal(true);
    } else {
      setSelectedChapter(ch);
      setStep('content');
    }
  };
  const handleExerciseQPress = (eq: TExerciseQuestion) => {
    setSelectedExerciseQ(eq);
    setShowExercisePopup(true);
  };
  const handleExerciseExplanation = () => {
    if (!selectedExerciseQ?.explanationURL) return;
    setShowExercisePopup(false);
    // Open Canva link in viewer
    setViewerItem({
      id: selectedExerciseQ.id,
      title: `Q${selectedExerciseQ.questionNumber} - Explanation`,
      description: '',
      contentURL: selectedExerciseQ.explanationURL,
      featureType,
      serviceType: 'FREE',
      sequence: 0,
      isActive: true,
      chapterId: selectedExerciseQ.chapterId,
      subjectId: selectedExerciseQ.subjectId,
      classId: selectedExerciseQ.classId,
    } as TFeatureContent);
    setStep('viewer');
  };
  const handleExerciseMCQ = () => {
    if (!selectedExerciseQ) return;
    setShowExercisePopup(false);
    navigation.navigate('TestMCQ', {
      testName: `${featureName} · Q${selectedExerciseQ.questionNumber}`,
      subjectName: selectedSubject?.name || 'Subject',
      subjectEmoji: SUBJECT_EMOJI[selectedSubject?.name?.trim().toLowerCase()] || '📘',
      subjectId: selectedSubject?.id || '',
      classId: selectedClass?.id || '',
      chapterId: selectedChapter?.id || '',
      chapterName: selectedChapter?.name || '',
      chapterNum: String(selectedChapter?.number || '').padStart(2, '0'),
      totalTime: 30 * 60,
      featureType,
      questionType: 'MCQ',
      exerciseQuestionId: selectedExerciseQ.id,
    });
  };
  const handleQuestionTypeSelect = (qType: string) => {
    if (!pendingChapter) return;
    setShowQuestionTypeModal(false);
    navigation.navigate('TestMCQ', {
      testName: `${featureName} · ${selectedSubject?.name}`,
      subjectName: selectedSubject?.name || 'Subject',
      subjectEmoji: SUBJECT_EMOJI[selectedSubject?.name?.trim().toLowerCase()] || '📘',
      subjectId: selectedSubject?.id || '',
      classId: selectedClass?.id || '',
      chapterId: pendingChapter.id,
      chapterName: pendingChapter.name,
      chapterNum: String(pendingChapter.number).padStart(2, '0'),
      totalTime: 30 * 60,
      featureType,
      questionType: qType,
    });
    setPendingChapter(null);
  };
  const handleExplanationContent = () => {
    if (!pendingChapter) return;
    setShowRevisionModal(false);
    // Load explanation content for this chapter
    setSelectedChapter(pendingChapter);
    setStep('content');
    setPendingChapter(null);
  };
  const handleExplanationMCQ = () => {
    if (!pendingChapter) return;
    setShowRevisionModal(false);
    navigation.navigate('TestMCQ', {
      testName: `Explanation · ${selectedSubject?.name}`,
      subjectName: selectedSubject?.name || 'Subject',
      subjectEmoji: SUBJECT_EMOJI[selectedSubject?.name?.trim().toLowerCase()] || '📘',
      subjectId: selectedSubject?.id || '',
      classId: selectedClass?.id || '',
      chapterId: pendingChapter.id,
      chapterName: pendingChapter.name,
      chapterNum: String(pendingChapter.number).padStart(2, '0'),
      totalTime: 30 * 60,
      featureType: 'explanation',
      questionType: 'MCQ',
    });
    setPendingChapter(null);
  };
  const handleBack = () => {
    if (step === 'viewer') {
      setViewerItem(null);
      // Go back to exerciseList if coming from exercise flow, otherwise content
      setStep(isExerciseListFeature ? 'exerciseList' : 'content');
    }
    else if (step === 'exerciseList') { setSelectedChapter(null); setStep('chapter'); }
    else if (step === 'content') { setSelectedChapter(null); setStep('chapter'); }
    else if (step === 'chapter') { setSelectedSubject(null); setSelectedClass(null); setStep('subject'); }
    else { navigation.goBack(); }
  };
  const openContent = (item: TFeatureContent) => {
    if (isPremiumServiceType(item.serviceType) && !hasPremium) {
      setShowPremiumModal(true);
      return;
    }
    if (item.contentURL) {
      setViewerItem(item);
      setStep('viewer');
    }
  };

  const breadcrumb = [featureName];
  if (selectedSubject) breadcrumb.push(selectedSubject.name);
  if (selectedClass) breadcrumb.push(selectedClass.name);
  if (selectedChapter) breadcrumb.push(selectedChapter.name);

  const stepTitle = step === 'subject' ? 'Choose Subject' : step === 'chapter' ? 'Choose Chapter' : selectedChapter?.name || 'Content';
  const stepNum = step === 'subject' ? 1 : step === 'chapter' ? 2 : 3;

  return (
    <LinearGradient colors={['#F5A623', '#F9C45A', '#FCDA3E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={handleBack} style={s.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={22} color="#111" />
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{featureName}</Text>
        </View>

        {/* Step dots */}
        <View style={s.stepDots}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={[s.dot, n === stepNum && s.dotActive, n < stepNum && s.dotDone]} />
          ))}
        </View>

        {/* Breadcrumb */}
        <View style={s.breadcrumb}>
          {breadcrumb.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Text style={s.breadSep}> › </Text>}
              <Text style={[s.breadText, i === breadcrumb.length - 1 && s.breadActive]}>{b.trim()}</Text>
            </React.Fragment>
          ))}
        </View>

        {step !== 'viewer' && step !== 'exerciseList' && (
        <ScrollView style={{ flex: 1, backgroundColor: '#FFF8E8' }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Step 1: Subject */}
          {step === 'subject' && (
            <View style={s.grid}>
              {subjects.map((sub: any, idx: number) => {
                const key = sub.name?.trim().toLowerCase();
                const emoji = SUBJECT_EMOJI[key] || '📘';
                return (
                  <TouchableOpacity key={sub.id} style={s.subCard} activeOpacity={0.85} onPress={() => handleSubjectPress(sub)}>
                    <View style={[s.subIcon, { backgroundColor: ['#43A047', '#1976D2', '#F5A623', '#C62828'][idx % 4] }]}>
                      <Text style={{ fontSize: 26 }}>{emoji}</Text>
                    </View>
                    <Text style={s.subLabel}>SUBJECT {String(idx + 1).padStart(2, '0')}</Text>
                    <Text style={s.subName} numberOfLines={1}>{sub.name}</Text>
                    <View style={s.subArrow}><Text style={s.subArrowText}>→</Text></View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Step 2: Chapter */}
          {step === 'chapter' && (
            chaptersLoading ? (
              <View style={s.center}><ActivityIndicator size="large" color="#F5A623" /></View>
            ) : chapters.length === 0 ? (
              <View style={s.center}><Text style={s.emptyText}>No chapters found</Text></View>
            ) : (
              <View style={s.chList}>
                {chapters.map((ch) => (
                  <TouchableOpacity key={ch.id} style={s.chCard} activeOpacity={0.85} onPress={() => handleChapterPress(ch)}>
                    <LinearGradient colors={['#FFB74D', '#F6C228']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.chNum}>
                      <Text style={s.chNumText}>{String(ch.number).padStart(2, '0')}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={s.chName} numberOfLines={1}>{ch.name}</Text>
                    </View>
                    <Text style={s.chArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}

          {/* Step 3: Content */}
          {step === 'content' && (
            contentLoading ? (
              <View style={s.center}><ActivityIndicator size="large" color="#F5A623" /></View>
            ) : contents.filter(c => c.isActive).length === 0 ? (
              <View style={s.center}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>📭</Text>
                <Text style={s.emptyTitle}>No content yet</Text>
                <Text style={s.emptyText}>Admin hasn't added content for this chapter</Text>
              </View>
            ) : (
              <View style={s.chList}>
                {contents.filter(c => c.isActive).map((item, i) => (
                  <TouchableOpacity key={item.id} style={s.contentCard} activeOpacity={0.85} onPress={() => openContent(item)}>
                    <View style={s.contentNum}>
                      <Text style={s.contentNumText}>{String(i + 1).padStart(2, '0')}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.contentTitle} numberOfLines={2}>{item.title}</Text>
                      {item.description ? <Text style={s.contentDesc} numberOfLines={1}>{item.description}</Text> : null}
                      <View style={s.contentMeta}>
                        <Text style={[s.contentTag, isPremiumServiceType(item.serviceType) && !hasPremium && { backgroundColor: '#FFF3CD', color: '#8B6914' }]}>{item.serviceType === 'FREE' ? '✓ FREE' : hasPremium ? '✓ PREMIUM' : '🔒 PAID'}</Text>
                      </View>
                    </View>
                    <ExternalLink size={16} color="#92400E" />
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}
        </ScrollView>
        )}

        {/* Step: Exercise Questions List (Exercise Revival / Exemplar / PYQ) */}
        {step === 'exerciseList' && (
          <ScrollView style={{ flex: 1, backgroundColor: '#FFF8E8' }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
              {isExerciseLoading ? (
                <View style={s.center}><ActivityIndicator size="large" color="#F5A623" /></View>
              ) : exerciseQuestions.length === 0 ? (
                <View style={s.center}>
                  <Text style={{ fontSize: 40, marginBottom: 8 }}>📭</Text>
                  <Text style={s.emptyTitle}>No questions yet</Text>
                  <Text style={s.emptyText}>Questions will appear here once added by admin</Text>
                </View>
              ) : (
                <View style={s.chList}>
                  {exerciseQuestions.map((eq, i) => (
                    <TouchableOpacity key={eq.id} style={s.contentCard} activeOpacity={0.85} onPress={() => handleExerciseQPress(eq)}>
                      <LinearGradient
                        colors={['#FFB74D', '#F6C228']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={s.contentNum}
                      >
                        <Text style={s.contentNumText}>{eq.questionNumber || String(i + 1)}</Text>
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text style={s.contentTitle} numberOfLines={2}>{eq.questionText}</Text>
                      </View>
                      <ChevronLeft size={16} color="#92400E" style={{ transform: [{ rotate: '180deg' }] }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* Step 4: Content Viewer */}
        {step === 'viewer' && viewerItem && (() => {
          const isPdf = /\.pdf(\?|$)/i.test(viewerItem.contentURL);
          const viewUrl = isPdf
            ? viewerItem.contentURL.replace(/\.pdf(\?|$)/i, '/index.html$1')
            : viewerItem.contentURL;
          return (
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
              <View style={s.viewerHeader}>
                <Text style={s.viewerTitle} numberOfLines={1}>{viewerItem.title}</Text>
              </View>
              <PlatformWebView
                source={{ uri: viewUrl }}
                style={{ flex: 1 }}
                protectedContent={true}
                debugLabel={viewerItem.title || 'FeatureViewer'}
              />
            </View>
          );
        })()}

        {/* Class Modal */}
        <Modal animationType="slide" transparent visible={showClassModal} onRequestClose={() => setShowClassModal(false)}>
          <TouchableWithoutFeedback onPress={() => setShowClassModal(false)}>
            <View style={s.modalBackdrop}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={s.modalSheet}>
                  <View style={s.modalGrip} />
                  <Text style={s.modalTitle}>Select Class</Text>
                  <Text style={s.modalSub}>{selectedSubject?.name}</Text>
                  <View style={{ gap: 10, marginTop: 14 }}>
                    {classes.map((cls: any, idx: number) => (
                      <TouchableOpacity key={cls.id} style={s.classCard} activeOpacity={0.85} onPress={() => handleClassSelect(cls)}>
                        <LinearGradient
                          colors={idx % 2 === 0 ? ['#F6C228', '#FFB74D'] : ['#42A5F5', '#1976D2']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.classIcon}
                        >
                          <Text style={s.classIconText}>{cls.name?.replace('Class ', '') || idx + 11}</Text>
                        </LinearGradient>
                        <Text style={s.className}>{cls.name}</Text>
                        <Text style={s.classArrow}>→</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Question Type Modal */}
        <Modal animationType="slide" transparent visible={showQuestionTypeModal} onRequestClose={() => setShowQuestionTypeModal(false)}>
          <TouchableWithoutFeedback onPress={() => setShowQuestionTypeModal(false)}>
            <View style={s.modalBackdrop}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={s.modalSheet}>
                  <View style={s.modalGrip} />
                  <Text style={s.modalTitle}>Choose Question Type</Text>
                  <Text style={s.modalSub}>{pendingChapter?.name}</Text>
                  <View style={{ gap: 10, marginTop: 14 }}>
                    {[
                      { key: 'MCQ', emoji: '📝', label: 'MCQ', desc: 'Multiple Choice Questions', colors: ['#66BB6A', '#43A047'] as [string, string] },
                    ].map((qt) => (
                      <TouchableOpacity key={qt.key} style={s.qtCard} activeOpacity={0.85} onPress={() => handleQuestionTypeSelect(qt.key)}>
                        <LinearGradient colors={qt.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.qtIcon}>
                          <Text style={{ fontSize: 22 }}>{qt.emoji}</Text>
                        </LinearGradient>
                        <View style={{ flex: 1 }}>
                          <Text style={s.qtLabel}>{qt.label}</Text>
                          <Text style={s.qtDesc}>{qt.desc}</Text>
                        </View>
                        <Text style={s.classArrow}>→</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Explanation — Explanation / Practice MCQ Modal */}
        <Modal animationType="slide" transparent visible={showRevisionModal} onRequestClose={() => setShowRevisionModal(false)}>
          <TouchableWithoutFeedback onPress={() => setShowRevisionModal(false)}>
            <View style={s.modalBackdrop}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={s.modalSheet}>
                  <View style={s.modalGrip} />
                  <Text style={s.modalTitle}>{pendingChapter?.name}</Text>
                  <Text style={s.modalSub}>What would you like to do?</Text>
                  <View style={{ gap: 10, marginTop: 14 }}>
                    <TouchableOpacity style={s.qtCard} activeOpacity={0.85} onPress={handleExplanationContent}>
                      <LinearGradient colors={['#42A5F5', '#1976D2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.qtIcon}>
                        <Text style={{ fontSize: 22 }}>📖</Text>
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text style={s.qtLabel}>Explanation</Text>
                        <Text style={s.qtDesc}>Read chapter explanation</Text>
                      </View>
                      <Text style={s.classArrow}>→</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.qtCard} activeOpacity={0.85} onPress={handleExplanationMCQ}>
                      <LinearGradient colors={['#66BB6A', '#43A047']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.qtIcon}>
                        <Text style={{ fontSize: 22 }}>📝</Text>
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text style={s.qtLabel}>Practice MCQ</Text>
                        <Text style={s.qtDesc}>Test your knowledge</Text>
                      </View>
                      <Text style={s.classArrow}>→</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Exercise Question Popup — Explanation / MCQ Zone */}
        <Modal animationType="slide" transparent visible={showExercisePopup} onRequestClose={() => setShowExercisePopup(false)}>
          <TouchableWithoutFeedback onPress={() => setShowExercisePopup(false)}>
            <View style={s.modalBackdrop}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={s.modalSheet}>
                  <View style={s.modalGrip} />
                  <Text style={s.modalTitle}>Q{selectedExerciseQ?.questionNumber}</Text>
                  <Text style={s.modalSub} numberOfLines={2}>{selectedExerciseQ?.questionText}</Text>
                  <View style={{ gap: 10, marginTop: 14 }}>
                    {selectedExerciseQ?.explanationURL ? (
                      <TouchableOpacity style={s.qtCard} activeOpacity={0.85} onPress={handleExerciseExplanation}>
                        <LinearGradient colors={['#42A5F5', '#1976D2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.qtIcon}>
                          <Text style={{ fontSize: 22 }}>📖</Text>
                        </LinearGradient>
                        <View style={{ flex: 1 }}>
                          <Text style={s.qtLabel}>Explanation</Text>
                          <Text style={s.qtDesc}>View detailed explanation</Text>
                        </View>
                        <Text style={s.classArrow}>→</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity style={s.qtCard} activeOpacity={0.85} onPress={handleExerciseMCQ}>
                      <LinearGradient colors={['#66BB6A', '#43A047']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.qtIcon}>
                        <Text style={{ fontSize: 22 }}>📝</Text>
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text style={s.qtLabel}>MCQ Zone</Text>
                        <Text style={s.qtDesc}>Practice MCQ questions</Text>
                      </View>
                      <Text style={s.classArrow}>→</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Premium Lock Modal */}
        <Modal animationType="fade" transparent visible={showPremiumModal} onRequestClose={() => setShowPremiumModal(false)}>
          <TouchableWithoutFeedback onPress={() => setShowPremiumModal(false)}>
            <View style={s.modalBackdrop}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={[s.modalSheet, { alignItems: 'center', paddingVertical: 30 }]}>
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>🔒</Text>
                  <Text style={[s.modalTitle, { marginBottom: 6 }]}>Premium Content</Text>
                  <Text style={[s.modalSub, { marginBottom: 20, paddingHorizontal: 20 }]}>
                    This content is available for premium subscribers only. Upgrade to access all content.
                  </Text>
                  <TouchableOpacity
                    style={{ backgroundColor: '#F6C228', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 }}
                    activeOpacity={0.85}
                    onPress={() => { setShowPremiumModal(false); navigation.navigate('Plans'); }}
                  >
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Upgrade Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowPremiumModal(false)} style={{ marginTop: 12 }}>
                    <Text style={{ color: '#888', fontSize: 13, fontWeight: '600' }}>Maybe Later</Text>
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

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(146,64,14,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#111', flex: 1 },
  stepDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  dot: { width: 22, height: 4, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.15)' },
  dotActive: { backgroundColor: '#111' },
  dotDone: { backgroundColor: '#92400E' },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, flexWrap: 'wrap' },
  breadText: { fontSize: 11, color: '#666', fontWeight: '600' },
  breadActive: { color: '#111', fontWeight: '800' },
  breadSep: { fontSize: 11, color: '#bbb' },
  scroll: { padding: 16, paddingBottom: 100 },
  center: { paddingVertical: 60, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 4 },
  emptyText: { fontSize: 12, color: '#999', textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  subCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 22, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 2 },
  subIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  subLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.5, color: '#888', marginBottom: 2, textTransform: 'uppercase' },
  subName: { fontSize: 17, fontWeight: '900', color: '#111', marginBottom: 8 },
  subArrow: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#F6C228', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  subArrowText: { color: '#fff', fontSize: 13, fontWeight: '900' },

  chList: { gap: 8 },
  chCard: { backgroundColor: '#fff', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  chNum: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chNumText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  chName: { fontSize: 13, fontWeight: '800', color: '#111' },
  chArrow: { fontSize: 22, color: '#92400E', fontWeight: '700' },

  contentCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  contentNum: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#92400E', alignItems: 'center', justifyContent: 'center' },
  contentNumText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  contentTitle: { fontSize: 13, fontWeight: '800', color: '#111', marginBottom: 2 },
  contentDesc: { fontSize: 11, color: '#777', marginBottom: 3 },
  contentMeta: { flexDirection: 'row', gap: 8 },
  contentTag: { fontSize: 9, fontWeight: '800', color: '#2E7D32', backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF8E8', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 22, paddingBottom: 36 },
  modalGrip: { width: 40, height: 4, borderRadius: 4, backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 19, fontWeight: '900', color: '#111', textAlign: 'center', marginBottom: 4 },
  modalSub: { fontSize: 12, color: '#666', textAlign: 'center' },
  classCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  classIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  classIconText: { fontSize: 18, fontWeight: '900', color: '#fff' },
  className: { flex: 1, fontSize: 15, fontWeight: '800', color: '#111' },
  classArrow: { fontSize: 18, fontWeight: '900', color: '#F6C228' },

  qtCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  qtIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qtLabel: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 2 },
  qtDesc: { fontSize: 11, color: '#777' },

  viewerHeader: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  viewerTitle: { fontSize: 14, fontWeight: '800', color: '#111', textAlign: 'center' },
});

export default FeatureContent;
