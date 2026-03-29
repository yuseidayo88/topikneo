import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { getGrammarReorderItems, lessonUsesGeneratedGrammarTts } from '@/src/data/grammar';
import { useGrammarStore } from '@/src/store/grammarStore';
import * as db from '@/src/db/database';
import { useProgressStore } from '@/src/store/progressStore';
import { useSubscriptionStore, FREE_LESSONS_PER_LEVEL } from '@/src/store/subscriptionStore';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { triggerSelectionHaptic, triggerSuccessNotification, triggerWarningNotification } from '@/src/utils/haptics';
import { spacing, radius, hexToRgba, GLASS_CARD_OPACITY, FONT_SCALE_MAX } from '@/src/theme';
import { getSettingsFlowTokens, PAD as HEADER_PAD, CONTENT_W as HEADER_CONTENT_W } from '@/src/theme/settingsFlowTokens';
import { getGrammarQuizStrings } from '@/src/i18n/grammarQuiz';
import { useProfileStore } from '@/src/store/profileStore';
import {
  playCorrectSound,
  playIncorrectSound,
  getConfiguredSpeechVolume,
  QUIZ_START_SPEECH_DELAY_MS,
} from '@/src/utils/quizSoundEffects';
import { isGrammarReorderAnswerCorrect } from '@/src/utils/grammarReorder';
import {
  preloadGeneratedWordSpeech,
  speakWordWithGeneratedFallback,
  stopGeneratedWordSpeechPlayback,
} from '@/src/utils/generatedWordSpeech';

/** 配列をシャッフル（Fisher-Yates） */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function GrammarQuizScreen() {
  const { resolvedMode } = useTheme();
  const { colors, typography, cardBorder, flowShadow: SHADOW } = useThemeStyles();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();
  const isSubscribed = useSubscriptionStore((s) => s.isSubscribed);
  const refresh = useProgressStore((s) => s.refresh);
  const grammarLessonNum = useMemo(
    () => parseInt((lessonId ?? '').replace(/^ko_G\d+_/, ''), 10) || 1,
    [lessonId]
  );
  useEffect(() => {
    if (grammarLessonNum > FREE_LESSONS_PER_LEVEL && !isSubscribed) {
      router.replace('/subscription');
    }
  }, [grammarLessonNum, isSubscribed, router]);
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const t = useMemo(() => getGrammarQuizStrings(displayLanguage), [displayLanguage]);
  const { headerPaddingTop, footerPaddingBottom } = useSafeArea();
  const TOKEN = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          paddingHorizontal: HEADER_PAD,
          paddingBottom: 14,
          backgroundColor: TOKEN.surface,
          borderBottomWidth: 1,
          borderBottomColor: TOKEN.border,
          zIndex: 10,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: HEADER_CONTENT_W,
          alignSelf: 'center',
          zIndex: 10,
        },
        headerCircleBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: TOKEN.surface,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: TOKEN.border,
          ...SHADOW,
        },
        headerTitle: {
          fontSize: 19,
          fontWeight: '700',
          color: TOKEN.ink,
          letterSpacing: -0.3,
          flex: 1,
          textAlign: 'center',
        },
        headerRight: { minWidth: 56, alignItems: 'flex-end' },
        headerCorrect: { ...typography.caption, color: TOKEN.inkMuted, fontWeight: '600', lineHeight: 18 },
        progressRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12, width: HEADER_CONTENT_W, alignSelf: 'center' },
        progressBarBg: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
        progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
        headerCount: { ...typography.caption, color: TOKEN.inkMuted },
        body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl + spacing.xl },
        topSpacer: { flex: 0.2 },
        quizContent: { gap: spacing.lg },
        bottomSpacer: { flex: 0.1 },
        questionBlock: { alignItems: 'center', width: '100%' },
        problemCard: {
          width: '100%',
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
          borderRadius: radius.xl,
          backgroundColor: hexToRgba(colors.card, GLASS_CARD_OPACITY),
          ...cardBorder,
          marginBottom: spacing.md,
        },
        problemLabel: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.primary,
          marginBottom: spacing.sm,
          textAlign: 'center',
        },
        problemSentence: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.text,
          textAlign: 'center',
          marginBottom: spacing.md + 2,
          lineHeight: 30,
        },
        translationHint: { fontSize: 18, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm, lineHeight: 26 },
        actionRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, width: '100%' },
        actionBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.xl,
          backgroundColor: hexToRgba(colors.card, GLASS_CARD_OPACITY),
          ...cardBorder,
        },
        actionBtnPressed: { opacity: 0.8 },
        actionBtnLabel: { fontSize: 14, fontWeight: '600', color: colors.primary, marginLeft: spacing.xs, lineHeight: 20 },
        instruction: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
        feedbackBox: {
          padding: spacing.lg,
          backgroundColor: hexToRgba(colors.card, GLASS_CARD_OPACITY),
          borderRadius: radius.lg,
          alignItems: 'center',
          gap: spacing.md,
          ...cardBorder,
          borderColor: colors.wrong,
        },
        feedbackBoxCorrect: {
          padding: spacing.xl,
          backgroundColor: hexToRgba(colors.card, GLASS_CARD_OPACITY),
          borderRadius: radius.lg,
          alignItems: 'center',
          ...cardBorder,
          borderColor: colors.correct,
        },
        feedbackWrong: { fontSize: 18, fontWeight: '700', color: colors.wrong },
        feedbackCorrect: { ...typography.body, color: colors.text, lineHeight: 22, textAlign: 'center' },
        feedbackCorrectLabel: { fontSize: 22, fontWeight: '800', color: colors.correct },
        wrongFeedbackPlayOuter: {
          width: '100%',
          maxWidth: HEADER_CONTENT_W,
          borderRadius: radius.lg,
          overflow: 'hidden',
          marginTop: spacing.xs,
        },
        wrongFeedbackPlayGradient: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.md + 2,
          paddingHorizontal: spacing.lg,
        },
        wrongFeedbackPlayText: { fontSize: 16, fontWeight: '700', color: colors.onPrimary },
        nextButton: {
          marginTop: spacing.sm,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          borderRadius: radius.lg,
          backgroundColor: TOKEN.surface,
          borderWidth: 1,
          borderColor: TOKEN.border,
        },
        nextButtonPressed: { opacity: 0.9 },
        nextButtonText: { fontSize: 16, fontWeight: '700', color: TOKEN.ink },
        answerRowWrap: {
          minHeight: 44,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          backgroundColor: hexToRgba(colors.card, GLASS_CARD_OPACITY),
          borderRadius: radius.lg,
          borderWidth: 2,
          borderColor: colors.primary,
          borderStyle: 'dashed',
        },
        answerRowInner: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: spacing.sm,
        },
        chipWrapper: {},
        answerPlaceholder: {
          ...typography.body,
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: 'center',
          paddingVertical: spacing.xs,
        },
        answerPeriod: { ...typography.body, fontSize: 15, color: colors.text, fontWeight: '600', marginLeft: 2 },
        tapHint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
        poolRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm, width: '100%' },
        poolChipWrap: { alignSelf: 'flex-start' },
        chip: {
          minHeight: 44,
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 999,
          justifyContent: 'center',
          backgroundColor: hexToRgba(colors.card, GLASS_CARD_OPACITY),
          ...cardBorder,
        },
        chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
        chipPressed: { opacity: 0.85 },
        chipText: { ...typography.body, fontSize: 17, fontWeight: '600', color: colors.text, lineHeight: 24 },
        chipTextSelected: { ...typography.body, fontSize: 17, fontWeight: '600', color: colors.onPrimary, lineHeight: 24 },
        checkButton: {
          paddingVertical: spacing.lg,
          borderRadius: radius.lg,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        },
        checkButtonDisabled: { backgroundColor: colors.border, opacity: 0.8 },
        checkButtonPressed: { opacity: 0.9 },
        checkButtonText: { fontSize: 18, fontWeight: '700', color: colors.onPrimary },
        checkButtonTextDisabled: { color: colors.textSecondary },
        centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
        emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
        emptySub: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
        emptyButton: { backgroundColor: colors.primary, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.lg },
        emptyButtonText: { fontSize: 16, fontWeight: '600', color: colors.onPrimary },
      }),
    [colors, typography, cardBorder, TOKEN, SHADOW]
  );

  const grammarContentLocale = useGrammarStore((s) => s.grammarContentLocale);
  const questions = useMemo(() => getGrammarReorderItems(lessonId ?? ''), [lessonId, grammarContentLocale]);

  const [order, setOrder] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [poolOrder, setPoolOrder] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false);
  const [wrongFeedback, setWrongFeedback] = useState<string | null>(null);
  const [translationMode, setTranslationMode] = useState<'always' | 'wrongOnly'>('always');
  const [initDone, setInitDone] = useState(false);
  const resultsByQuizIdRef = useRef<Record<string, 0 | 1>>({});

  const q = order.length > 0 && questions[order[currentIndex]] ? questions[order[currentIndex]] : null;
  const chunks = q?.chunks ?? [];
  const correctIndices = useMemo(() => chunks.map((_, i) => i), [chunks.length]);

  /** 同一文字のチャンクが複数ある場合も、並んだ文が正解と一致すれば正解（見た目だけで区別できないため） */
  const isCorrectOrder = useMemo(
    () => isGrammarReorderAnswerCorrect(chunks, selectedIndices),
    [chunks, selectedIndices]
  );

  const remainingIndices = useMemo(() => {
    return poolOrder.filter((i) => !selectedIndices.includes(i));
  }, [poolOrder, selectedIndices]);

  const showTranslationHint = translationMode === 'always' || wrongFeedback !== null;
  const shouldUseGeneratedForLesson = lessonUsesGeneratedGrammarTts(lessonId);

  const getSentenceToSpeak = () => (q?.chunks?.length ? q.chunks.join(' ').trim() + '.' : '');

  const stopSpeechPlayback = () => {
    if (shouldUseGeneratedForLesson) {
      void stopGeneratedWordSpeechPlayback();
      return;
    }
    Speech.stop();
  };

  const speakSentence = (sentence: string, callbacks?: { onDone?: () => void; onStopped?: () => void; onError?: () => void }) => {
    if (!sentence) return;
    if (shouldUseGeneratedForLesson) {
      void speakWordWithGeneratedFallback('example', sentence, {
        language: 'ko-KR',
        rate: 0.9,
        volume: getConfiguredSpeechVolume(),
        onDone: callbacks?.onDone,
        onStopped: callbacks?.onStopped,
        onError: callbacks?.onError,
      });
      return;
    }
    Speech.stop();
    Speech.speak(sentence.replace(/\s*\.\s*$/, ''), {
      language: 'ko-KR',
      rate: 0.9,
      volume: getConfiguredSpeechVolume(),
      onDone: callbacks?.onDone,
      onStopped: callbacks?.onStopped,
      onError: callbacks?.onError,
    });
  };

  const handleQuitPress = () => {
    Alert.alert(
      t.quitConfirmTitle,
      undefined,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.quit,
          style: 'destructive',
          onPress: () => {
            stopSpeechPlayback();
            router.back();
          },
        },
      ]
    );
  };

  useEffect(() => {
    return () => {
      stopSpeechPlayback();
    };
  }, []);

  /** 不正解時：少し遅れて正解文を自動読み上げ（ボタンと併用可） */
  useEffect(() => {
    if (!wrongFeedback) return;
    const timer = setTimeout(() => {
      speakSentence(wrongFeedback);
    }, 500);
    return () => clearTimeout(timer);
  }, [wrongFeedback, shouldUseGeneratedForLesson]);

  useEffect(() => {
    if (!lessonId) return;
    if (questions.length === 0) {
      setInitDone(true);
      return;
    }
    resultsByQuizIdRef.current = {};
    setOrder(questions.map((_, i) => i).sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setCorrectCount(0);
    setInitDone(true);
  }, [questions.length, lessonId, grammarContentLocale]);

  useEffect(() => {
    if (!q || chunks.length === 0) return;
    setPoolOrder(shuffle(correctIndices));
    setSelectedIndices([]);
  }, [q?.id]);

  useEffect(() => {
    if (!q?.chunks?.length) return;
    const sentence = getSentenceToSpeak();
    if (!sentence) return;
    if (shouldUseGeneratedForLesson) {
      void preloadGeneratedWordSpeech('example', sentence);
      const nextQuestion = order.length > currentIndex + 1 ? questions[order[currentIndex + 1]] : null;
      const nextSentence = nextQuestion?.chunks?.length ? `${nextQuestion.chunks.join(' ').trim()}.` : '';
      if (nextSentence) void preloadGeneratedWordSpeech('example', nextSentence);
    }
    const delay = currentIndex === 0 ? QUIZ_START_SPEECH_DELAY_MS : 0;
    const timer = setTimeout(() => {
      speakSentence(sentence);
    }, delay);
    return () => clearTimeout(timer);
  }, [q?.id, currentIndex, shouldUseGeneratedForLesson, order, questions]);

  const handlePoolTap = (index: number) => {
    if (waiting) return;
    void triggerSelectionHaptic();
    setSelectedIndices((prev) => [...prev, index]);
  };

  const handleSelectedTap = (index: number) => {
    if (waiting) return;
    void triggerSelectionHaptic();
    setSelectedIndices((prev) => prev.filter((i) => i !== index));
  };

  const goToNext = (totalCorrect: number) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      stopSpeechPlayback();
      db.setLessonCleared(lessonId!, 'grammar');
      db.incrementStreak();
      db.addDailyStats(1, totalCorrect);
      refresh();
      router.replace({
        pathname: '/quiz/result/[lessonId]',
        params: {
          lessonId: lessonId!,
          type: 'grammar',
          total: String(questions.length),
          correct: String(totalCorrect),
        },
      });
    } else {
      setCurrentIndex(nextIndex);
      setWrongFeedback(null);
      setShowCorrectFeedback(false);
      setWaiting(false);
    }
  };

  const handleCheck = () => {
    if (waiting || !q || selectedIndices.length !== chunks.length) return;
    const correct = isCorrectOrder;
    resultsByQuizIdRef.current = { ...resultsByQuizIdRef.current, [q.id]: correct ? 1 : 0 };
    const newCorrectCount = correctCount + (correct ? 1 : 0);
    setCorrectCount(newCorrectCount);
    if (correct) void playCorrectSound();
    else void playIncorrectSound();

    if (correct) {
      setWaiting(true);
      setShowCorrectFeedback(true);
      void triggerSuccessNotification();
      const sentence = getSentenceToSpeak();
      const nextIdx = currentIndex + 1;
      const advanceToNext = () => {
        if (nextIdx >= questions.length) {
          stopSpeechPlayback();
          db.setLessonCleared(lessonId!, 'grammar');
          db.incrementStreak();
          db.addDailyStats(1, newCorrectCount);
          refresh();
          router.replace({
            pathname: '/quiz/result/[lessonId]',
            params: {
              lessonId: lessonId!,
              type: 'grammar',
              total: String(questions.length),
              correct: String(newCorrectCount),
            },
          });
        } else {
          setCurrentIndex(nextIdx);
          setShowCorrectFeedback(false);
          setWaiting(false);
        }
      };
      if (sentence) {
        speakSentence(sentence, {
          onDone: advanceToNext,
          onStopped: advanceToNext,
          onError: advanceToNext,
        });
      } else {
        setTimeout(advanceToNext, 800);
      }
    } else {
      void triggerWarningNotification();
      setWrongFeedback(chunks.join(' ') + '.');
      setWaiting(true);
    }
  };

  const handleSpeakCorrectAnswer = () => {
    if (!wrongFeedback) return;
    speakSentence(wrongFeedback);
  };

  const handleNextAfterWrong = () => {
    if (!wrongFeedback) return;
    stopSpeechPlayback();
    const totalCorrect = correctCount;
    setWrongFeedback(null);
    goToNext(totalCorrect);
  };

  const handleSpeak = () => {
    const sentence = getSentenceToSpeak();
    if (!sentence) return;
    speakSentence(sentence);
  };

  if (!initDone) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
          <View style={styles.headerRow}>
            <Pressable
              style={({ pressed }) => [styles.headerCircleBtn, pressed && { opacity: 0.8 }]}
              onPress={() => router.back()}
              accessibilityLabel={t.backToLesson}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color={TOKEN.ink} />
            </Pressable>
            <Text style={styles.headerTitle}>{t.quizTitle}</Text>
            <View style={styles.headerRight} />
          </View>
        </View>
        <View style={[styles.body, styles.centered]}>
          <Text style={styles.emptyTitle}>{t.noQuestionsTitle}</Text>
          <Text style={styles.emptySub}>{t.noQuestionsSub}</Text>
          <Pressable
            style={({ pressed }) => [styles.emptyButton, pressed && { opacity: 0.9 }]}
            onPress={() => router.back()}
            accessibilityLabel={t.backToLesson}
            accessibilityRole="button"
          >
            <Text style={styles.emptyButtonText}>{t.backToLesson}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const progress = order.length > 0 ? (currentIndex + 1) / questions.length : 0;
  const canCheck = selectedIndices.length === chunks.length;

  return (
    <View style={styles.container}>
      <View
        style={[styles.header, { paddingTop: headerPaddingTop }]}
        accessibilityRole="header"
        accessibilityLabel={t.quizHeaderA11y(t.quizTitle, currentIndex + 1, questions.length)}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.headerCircleBtn, pressed && { opacity: 0.8 }]}
            onPress={handleQuitPress}
            accessibilityLabel={t.quitButtonLabel}
            accessibilityRole="button"
          >
            <Ionicons name="close" size={22} color={TOKEN.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{t.quizTitle}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.headerCorrect}>{t.correctScore(correctCount)}</Text>
          </View>
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.headerCount}>{currentIndex + 1} / {questions.length}</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      </View>

      <View style={[styles.body, { paddingBottom: footerPaddingBottom + spacing.lg }]}>
        <View style={styles.topSpacer} />
        <View style={styles.quizContent}>
          <View style={styles.questionBlock}>
            <View style={styles.problemCard}>
              <Text style={styles.problemLabel}>{t.problemLabel}</Text>
              {q?.translation && showTranslationHint ? (
                <Text style={styles.problemSentence}>{q.translation}</Text>
              ) : null}
              <View style={styles.actionRow}>
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                  onPress={handleSpeak}
                  accessibilityLabel={t.playPronunciation}
                  accessibilityRole="button"
                >
                  <Ionicons name="volume-high-outline" size={22} color={colors.primary} />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                  onPress={() => setTranslationMode((m) => (m === 'always' ? 'wrongOnly' : 'always'))}
                  accessibilityLabel={translationMode === 'always' ? t.translationAlways : t.translationWrongOnly}
                  accessibilityRole="button"
                >
                  <Ionicons name="language-outline" size={22} color={colors.primary} />
                  <Text style={styles.actionBtnLabel}>{t.translationToggleLabel}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {showCorrectFeedback ? (
            <View style={styles.feedbackBoxCorrect} accessibilityLabel={t.correct} accessibilityLiveRegion="polite">
              <Text style={styles.feedbackCorrectLabel}>{t.correct}</Text>
            </View>
          ) : wrongFeedback ? (
            <View
              style={styles.feedbackBox}
              accessibilityLabel={`${t.wrong}. ${t.correctAnswerLabel} ${wrongFeedback}`}
              accessibilityLiveRegion="polite"
            >
              <Text style={styles.feedbackWrong} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                {t.wrong}
              </Text>
              <Text style={styles.feedbackCorrect} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                {t.correctAnswerLabel} {wrongFeedback}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.wrongFeedbackPlayOuter, pressed && { opacity: 0.92 }]}
                onPress={handleSpeakCorrectAnswer}
                accessibilityLabel={t.playCorrectSentence}
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.wrongFeedbackPlayGradient}
                >
                  <Ionicons name="volume-high-outline" size={22} color={colors.onPrimary} />
                  <Text style={styles.wrongFeedbackPlayText} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                    {t.playCorrectSentence}
                  </Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.nextButton, pressed && styles.nextButtonPressed]}
                onPress={handleNextAfterWrong}
                accessibilityLabel={t.next}
                accessibilityRole="button"
              >
                <Text style={styles.nextButtonText} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                  {t.next}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.instruction}>{t.instruction}</Text>
          )}

          {!wrongFeedback && !showCorrectFeedback ? (
          <>
          <View style={styles.answerRowWrap}>
            {selectedIndices.length === 0 ? (
              <Text style={styles.answerPlaceholder}>{t.answerPlaceholder}</Text>
            ) : (
              <View style={styles.answerRowInner}>
                {selectedIndices.map((idx, i) => (
                  <View key={`sel-${idx}`} style={styles.chipWrapper}>
                    <Pressable
                      style={({ pressed }) => [styles.chip, styles.chipSelected, pressed && styles.chipPressed]}
                      onPress={() => handleSelectedTap(idx)}
                      disabled={waiting}
                      accessibilityLabel={t.selectedTapToReturn(i + 1, chunks[idx])}
                      accessibilityRole="button"
                    >
                      <Text style={styles.chipTextSelected} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                        {chunks[idx]}
                      </Text>
                    </Pressable>
                  </View>
                ))}
                <Text style={styles.answerPeriod} accessibilityLabel={t.periodLabel}>.</Text>
              </View>
            )}
          </View>
          <Text style={styles.tapHint}>{t.tapHint}</Text>

          <View style={styles.poolRow}>
            {remainingIndices.map((idx, poolIndex) => (
              <View key={`pool-${idx}`} style={styles.poolChipWrap}>
                <Pressable
                  style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                  onPress={() => handlePoolTap(idx)}
                  disabled={waiting}
                  accessibilityLabel={t.poolWordLabel(poolIndex + 1, remainingIndices.length, chunks[idx])}
                  accessibilityRole="button"
                >
                  <Text style={styles.chipText} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                    {chunks[idx]}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.checkButton,
              !canCheck && styles.checkButtonDisabled,
              canCheck && pressed && styles.checkButtonPressed,
            ]}
            onPress={handleCheck}
            disabled={!canCheck || waiting}
            accessibilityLabel={canCheck ? t.confirmAnswer : t.selectAllFirst}
            accessibilityRole="button"
          >
            <Text style={[styles.checkButtonText, !canCheck && styles.checkButtonTextDisabled]}>
              {t.confirm}
            </Text>
          </Pressable>
          </>
          ) : null}
        </View>
        <View style={styles.bottomSpacer} />
      </View>
    </View>
  );
}

