import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check, X, ArrowRight } from 'lucide-react-native';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

const { width } = Dimensions.get('window');

type MatchPair = { left: string; right: string };

type Question = {
  id: string;
  text: string;
  questionType: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: string;
  correctAnswer?: string;
  matchPairs?: string;
  explanation?: string;
  difficulty: string;
  Chapter?: { id: string; name: string };
  Subject?: { id: string; name: string };
};

const useRevisionQuestions = (chapterId?: string, subjectId?: string, classId?: string) => {
  return useQuery({
    queryKey: ['revision-recall-questions', chapterId, subjectId, classId],
    queryFn: () =>
      api.get('/api/v1/questions', {
        params: { featureType: 'revision_recall', chapterId, subjectId, classId },
      }),
    enabled: !!(chapterId || subjectId || classId),
  });
};

// Subject selection step
const useSubjects = () => useQuery({ queryKey: ['subjects'], queryFn: () => api.get('/api/v1/subjects') });
const useChapters = (subjectId: string) => useQuery({
  queryKey: ['chapters', subjectId],
  queryFn: () => api.get('/api/v1/chapters', { params: { subjectId } }),
  enabled: !!subjectId,
});

export const RevisionRecall = ({ navigation, route }: any) => {
  const [step, setStep] = useState<'subject' | 'chapter' | 'quiz' | 'result'>('subject');
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showExplanation, setShowExplanation] = useState(false);

  const { data: subData, isLoading: subLoading } = useSubjects();
  const subjects = (subData as any)?.data || [];

  const { data: chapData, isLoading: chapLoading } = useChapters(selectedSubject?.id);
  const chapters = (chapData as any)?.data || [];

  const { data: qData, isLoading: qLoading } = useRevisionQuestions(
    selectedChapter?.id, selectedSubject?.id
  );
  const questions: Question[] = (qData as any)?.data || [];

  const currentQ = questions[currentIdx];
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined;
  const isAnswered = currentAnswer !== undefined;

  const score = useMemo(() => {
    let correct = 0;
    let total = questions.length;
    questions.forEach(q => {
      const ans = answers[q.id];
      if (ans === undefined) return;
      if (q.questionType === 'MCQ' && ans === q.correctOption) correct++;
      if (q.questionType === 'FILL_BLANK' && ans?.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim()) correct++;
      if (q.questionType === 'MATCH') {
        try {
          const pairs: MatchPair[] = JSON.parse(q.matchPairs || '[]');
          const userPairs = ans || {};
          const allCorrect = pairs.every((p, i) => userPairs[i] === p.right);
          if (allCorrect) correct++;
        } catch {}
      }
    });
    return { correct, total };
  }, [answers, questions]);

  const handleSelectSubject = (sub: any) => {
    setSelectedSubject(sub);
    setStep('chapter');
  };

  const handleSelectChapter = (ch: any) => {
    setSelectedChapter(ch);
    setCurrentIdx(0);
    setAnswers({});
    setShowExplanation(false);
    setStep('quiz');
  };

  const handleMCQAnswer = (option: string) => {
    if (isAnswered) return;
    setAnswers(prev => ({ ...prev, [currentQ.id]: option }));
    setShowExplanation(true);
  };

  const handleFillAnswer = (text: string) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: text }));
  };

  const submitFill = () => {
    setShowExplanation(true);
  };

  const handleMatchAnswer = (idx: number, right: string) => {
    const prev = answers[currentQ.id] || {};
    setAnswers(prevAll => ({ ...prevAll, [currentQ.id]: { ...prev, [idx]: right } }));
  };

  const submitMatch = () => {
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setShowExplanation(false);
    } else {
      setStep('result');
    }
  };

  const goBack = () => {
    if (step === 'chapter') setStep('subject');
    else if (step === 'quiz') { setStep('chapter'); setCurrentIdx(0); setAnswers({}); }
    else if (step === 'result') { setStep('chapter'); setCurrentIdx(0); setAnswers({}); }
    else navigation.goBack();
  };

  // ====== RENDER ======

  // Subject selection
  if (step === 'subject') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><ChevronLeft size={22} color="#111" /></TouchableOpacity>
          <Text style={s.headerTitle}>Revision Recall Station</Text>
        </View>
        <Text style={s.stepTitle}>Pick a Subject</Text>
        {subLoading ? <ActivityIndicator size="large" color="#F5A623" style={{ marginTop: 40 }} /> : (
          <FlatList
            data={subjects}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }: any) => (
              <TouchableOpacity style={s.selectCard} onPress={() => handleSelectSubject(item)}>
                <Text style={s.selectEmoji}>{"\ud83d\udcda"}</Text>
                <Text style={s.selectName}>{item.name}</Text>
                <ArrowRight size={18} color="#92400E" />
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // Chapter selection
  if (step === 'chapter') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={goBack} style={s.backBtn}><ChevronLeft size={22} color="#111" /></TouchableOpacity>
          <Text style={s.headerTitle}>{selectedSubject?.name}</Text>
        </View>
        <Text style={s.stepTitle}>Pick a Chapter</Text>
        {chapLoading ? <ActivityIndicator size="large" color="#F5A623" style={{ marginTop: 40 }} /> : (
          <FlatList
            data={chapters}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }: any) => (
              <TouchableOpacity style={s.selectCard} onPress={() => handleSelectChapter(item)}>
                <View style={s.chNumBadge}><Text style={s.chNum}>{item.number}</Text></View>
                <Text style={s.selectName}>{item.name}</Text>
                <ArrowRight size={18} color="#92400E" />
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // Result
  if (step === 'result') {
    const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={goBack} style={s.backBtn}><ChevronLeft size={22} color="#111" /></TouchableOpacity>
          <Text style={s.headerTitle}>Results</Text>
        </View>
        <View style={s.resultWrap}>
          <Text style={{ fontSize: 60 }}>{pct >= 80 ? '\ud83c\udf1f' : pct >= 50 ? '\ud83d\udc4d' : '\ud83d\udcaa'}</Text>
          <Text style={s.resultPct}>{pct}%</Text>
          <Text style={s.resultLabel}>Score</Text>
          <View style={s.resultRow}>
            <View style={[s.resultBox, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[s.resultBoxNum, { color: '#2E7D32' }]}>{score.correct}</Text>
              <Text style={s.resultBoxLabel}>Correct</Text>
            </View>
            <View style={[s.resultBox, { backgroundColor: '#FFEBEE' }]}>
              <Text style={[s.resultBoxNum, { color: '#C62828' }]}>{score.total - score.correct}</Text>
              <Text style={s.resultBoxLabel}>Wrong</Text>
            </View>
            <View style={[s.resultBox, { backgroundColor: '#FFF8E1' }]}>
              <Text style={[s.resultBoxNum, { color: '#F57F17' }]}>{score.total}</Text>
              <Text style={s.resultBoxLabel}>Total</Text>
            </View>
          </View>
          <TouchableOpacity style={s.retryBtn} onPress={() => { setCurrentIdx(0); setAnswers({}); setShowExplanation(false); setStep('quiz'); }}>
            <Text style={s.retryText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.backToBtn} onPress={() => setStep('chapter')}>
            <Text style={s.backToText}>Pick Another Chapter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Quiz
  if (qLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={goBack} style={s.backBtn}><ChevronLeft size={22} color="#111" /></TouchableOpacity>
          <Text style={s.headerTitle}>Loading...</Text>
        </View>
        <ActivityIndicator size="large" color="#F5A623" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={goBack} style={s.backBtn}><ChevronLeft size={22} color="#111" /></TouchableOpacity>
          <Text style={s.headerTitle}>Revision Recall</Text>
        </View>
        <View style={s.emptyWrap}>
          <Text style={{ fontSize: 48 }}>{"\ud83d\udcdd"}</Text>
          <Text style={s.emptyTitle}>No questions yet</Text>
          <Text style={s.emptyDesc}>Questions will appear here once added by admin</Text>
        </View>
      </SafeAreaView>
    );
  }

  const qType = currentQ?.questionType || 'MCQ';
  let matchPairs: MatchPair[] = [];
  let shuffledRights: string[] = [];
  if (qType === 'MATCH' && currentQ?.matchPairs) {
    try {
      matchPairs = JSON.parse(currentQ.matchPairs);
      shuffledRights = [...matchPairs.map(p => p.right)].sort(() => Math.random() - 0.5);
    } catch {}
  }

  const isCorrectMCQ = qType === 'MCQ' && currentAnswer === currentQ?.correctOption;
  const isCorrectFill = qType === 'FILL_BLANK' && currentAnswer?.toLowerCase().trim() === currentQ?.correctAnswer?.toLowerCase().trim();
  const isCorrectMatch = (() => {
    if (qType !== 'MATCH') return false;
    try {
      const pairs: MatchPair[] = JSON.parse(currentQ?.matchPairs || '[]');
      const userPairs = currentAnswer || {};
      return pairs.every((p, i) => userPairs[i] === p.right);
    } catch { return false; }
  })();
  const isCorrect = isCorrectMCQ || isCorrectFill || isCorrectMatch;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}><ChevronLeft size={22} color="#111" /></TouchableOpacity>
        <Text style={s.headerTitle}>Q {currentIdx + 1} / {questions.length}</Text>
        <View style={s.typeBadge}><Text style={s.typeText}>{qType === 'MCQ' ? 'MCQ' : qType === 'FILL_BLANK' ? 'Fill Blank' : 'Match'}</Text></View>
      </View>

      {/* Progress bar */}
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${((currentIdx + 1) / questions.length) * 100}%` }]} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Difficulty badge */}
        <View style={s.diffRow}>
          <View style={[s.diffBadge, currentQ.difficulty === 'EASY' ? s.diffEasy : currentQ.difficulty === 'HARD' ? s.diffHard : s.diffMed]}>
            <Text style={s.diffText}>{currentQ.difficulty}</Text>
          </View>
        </View>

        {/* Question text */}
        <Text style={s.questionText}>{currentQ.text}</Text>

        {/* MCQ */}
        {qType === 'MCQ' && (
          <View style={s.optionsWrap}>
            {['A', 'B', 'C', 'D'].map(letter => {
              const optText = (currentQ as any)[`option${letter}`];
              if (!optText) return null;
              const selected = currentAnswer === letter;
              const correct = currentQ.correctOption === letter;
              let bg = '#fff';
              let border = '#e0e0e0';
              if (showExplanation && correct) { bg = '#E8F5E9'; border = '#4CAF50'; }
              else if (showExplanation && selected && !correct) { bg = '#FFEBEE'; border = '#EF5350'; }
              else if (selected) { bg = '#FFF8E1'; border = '#F5A623'; }
              return (
                <TouchableOpacity key={letter} style={[s.optionCard, { backgroundColor: bg, borderColor: border }]} onPress={() => handleMCQAnswer(letter)} disabled={isAnswered}>
                  <View style={[s.optLetter, showExplanation && correct ? { backgroundColor: '#4CAF50' } : showExplanation && selected ? { backgroundColor: '#EF5350' } : {}]}>
                    <Text style={[s.optLetterText, (showExplanation && (correct || selected)) ? { color: '#fff' } : {}]}>{letter}</Text>
                  </View>
                  <Text style={s.optText}>{optText}</Text>
                  {showExplanation && correct && <Check size={18} color="#4CAF50" />}
                  {showExplanation && selected && !correct && <X size={18} color="#EF5350" />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Fill in Blank */}
        {qType === 'FILL_BLANK' && (
          <View style={s.fillWrap}>
            <TextInput
              style={[s.fillInput, showExplanation && (isCorrectFill ? s.fillCorrect : s.fillWrong)]}
              placeholder="Type your answer..."
              placeholderTextColor="#aaa"
              value={currentAnswer || ''}
              onChangeText={handleFillAnswer}
              editable={!showExplanation}
              autoCapitalize="none"
            />
            {!showExplanation && (
              <TouchableOpacity style={s.submitBtn} onPress={submitFill} disabled={!currentAnswer}>
                <Text style={s.submitText}>Submit Answer</Text>
              </TouchableOpacity>
            )}
            {showExplanation && (
              <View style={[s.fillFeedback, isCorrectFill ? s.feedbackCorrect : s.feedbackWrong]}>
                <Text style={s.feedbackText}>{isCorrectFill ? 'Correct!' : `Wrong! Answer: ${currentQ.correctAnswer}`}</Text>
              </View>
            )}
          </View>
        )}

        {/* Match the Following */}
        {qType === 'MATCH' && matchPairs.length > 0 && (
          <View style={s.matchWrap}>
            <Text style={s.matchInstruction}>Match each item on the left with the correct item on the right</Text>
            {matchPairs.map((pair, i) => {
              const userChoice = (currentAnswer || {})[i];
              const isThisCorrect = userChoice === pair.right;
              return (
                <View key={i} style={s.matchRow}>
                  <View style={s.matchLeft}>
                    <Text style={s.matchLeftText}>{pair.left}</Text>
                  </View>
                  <Text style={s.matchArrow}>{showExplanation ? (isThisCorrect ? '\u2713' : '\u2717') : '\u2192'}</Text>
                  {!showExplanation ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.matchRightScroll}>
                      {shuffledRights.map((r, ri) => (
                        <TouchableOpacity
                          key={ri}
                          style={[s.matchChip, userChoice === r && s.matchChipSelected]}
                          onPress={() => handleMatchAnswer(i, r)}
                        >
                          <Text style={[s.matchChipText, userChoice === r && s.matchChipTextSelected]}>{r}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={[s.matchRight, isThisCorrect ? s.matchRightCorrect : s.matchRightWrong]}>
                      <Text style={s.matchRightText}>{userChoice || '—'}</Text>
                      {!isThisCorrect && <Text style={s.matchCorrectText}>{pair.right}</Text>}
                    </View>
                  )}
                </View>
              );
            })}
            {!showExplanation && (
              <TouchableOpacity style={s.submitBtn} onPress={submitMatch}>
                <Text style={s.submitText}>Check Answers</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Explanation */}
        {showExplanation && currentQ.explanation && (
          <View style={s.explanationBox}>
            <Text style={s.explanationTitle}>Explanation</Text>
            <Text style={s.explanationText}>{currentQ.explanation}</Text>
          </View>
        )}

        {/* Next button */}
        {showExplanation && (
          <TouchableOpacity style={s.nextBtn} onPress={nextQuestion}>
            <Text style={s.nextText}>{currentIdx < questions.length - 1 ? 'Next Question' : 'See Results'}</Text>
            <ArrowRight size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8E8' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F5A623', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(146,64,14,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111', flex: 1 },
  typeBadge: { backgroundColor: 'rgba(146,64,14,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeText: { fontSize: 11, fontWeight: '700', color: '#451A03' },
  progressBar: { height: 4, backgroundColor: '#e0d4b0' },
  progressFill: { height: '100%', backgroundColor: '#92400E', borderRadius: 2 },
  stepTitle: { fontSize: 18, fontWeight: '800', color: '#111', padding: 16, paddingBottom: 8 },
  selectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#efefef', gap: 12 },
  selectEmoji: { fontSize: 24 },
  selectName: { fontSize: 15, fontWeight: '700', color: '#111', flex: 1 },
  chNumBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5A623', alignItems: 'center', justifyContent: 'center' },
  chNum: { fontSize: 13, fontWeight: '800', color: '#fff' },
  diffRow: { marginBottom: 12 },
  diffBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  diffEasy: { backgroundColor: '#E8F5E9' },
  diffMed: { backgroundColor: '#FFF8E1' },
  diffHard: { backgroundColor: '#FFEBEE' },
  diffText: { fontSize: 10, fontWeight: '700' },
  questionText: { fontSize: 17, fontWeight: '700', color: '#111', lineHeight: 24, marginBottom: 20 },
  optionsWrap: { gap: 10 },
  optionCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1.5, gap: 12 },
  optLetter: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  optLetterText: { fontSize: 14, fontWeight: '800', color: '#333' },
  optText: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1 },
  fillWrap: { gap: 12 },
  fillInput: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, padding: 14, fontSize: 16, fontWeight: '600', color: '#111' },
  fillCorrect: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  fillWrong: { borderColor: '#EF5350', backgroundColor: '#FFEBEE' },
  fillFeedback: { padding: 12, borderRadius: 10 },
  feedbackCorrect: { backgroundColor: '#E8F5E9' },
  feedbackWrong: { backgroundColor: '#FFEBEE' },
  feedbackText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  submitBtn: { backgroundColor: '#92400E', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  matchWrap: { gap: 12 },
  matchInstruction: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 4 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  matchLeft: { backgroundColor: '#92400E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minWidth: 80 },
  matchLeftText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  matchArrow: { fontSize: 16, color: '#92400E', fontWeight: '800' },
  matchRightScroll: { flex: 1 },
  matchChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 6 },
  matchChipSelected: { backgroundColor: '#FFF8E1', borderColor: '#F5A623' },
  matchChipText: { fontSize: 11, fontWeight: '600', color: '#555' },
  matchChipTextSelected: { color: '#92400E', fontWeight: '800' },
  matchRight: { flex: 1, padding: 8, borderRadius: 8 },
  matchRightCorrect: { backgroundColor: '#E8F5E9' },
  matchRightWrong: { backgroundColor: '#FFEBEE' },
  matchRightText: { fontSize: 12, fontWeight: '700' },
  matchCorrectText: { fontSize: 10, color: '#4CAF50', fontWeight: '600', marginTop: 2 },
  explanationBox: { backgroundColor: '#F0F4FF', borderRadius: 12, padding: 14, marginTop: 16, borderLeftWidth: 3, borderLeftColor: '#92400E' },
  explanationTitle: { fontSize: 12, fontWeight: '800', color: '#92400E', marginBottom: 4 },
  explanationText: { fontSize: 13, color: '#333', lineHeight: 19 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#92400E', padding: 14, borderRadius: 12, marginTop: 16 },
  nextText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#92400E', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 4 },
  resultWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  resultPct: { fontSize: 48, fontWeight: '900', color: '#92400E', marginTop: 8 },
  resultLabel: { fontSize: 16, fontWeight: '700', color: '#888' },
  resultRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  resultBox: { alignItems: 'center', padding: 16, borderRadius: 12, minWidth: 80 },
  resultBoxNum: { fontSize: 24, fontWeight: '900' },
  resultBoxLabel: { fontSize: 11, fontWeight: '600', color: '#888', marginTop: 2 },
  retryBtn: { backgroundColor: '#92400E', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12, marginTop: 24 },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  backToBtn: { marginTop: 12, paddingVertical: 10 },
  backToText: { color: '#92400E', fontSize: 14, fontWeight: '700' },
});

export default RevisionRecall;
