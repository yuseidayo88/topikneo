import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  build,
  decompose,
  syllableToRomanization,
  CHO_LIST,
  JUNG_LIST,
  JONG_LIST,
  CHO_ROMANIZATION,
  JUNG_ROMANIZATION,
  JONG_ROMANIZATION,
} from '@/src/utils/hangul';
import {
  COMMON_CHO,
  COMMON_JUNG,
  DOUBLE_JONG,
  SINGLE_JONG,
  getChoOptionsForCourse,
  getJongPoolForCourse,
  getOptionsFromPool,
  getSyllablePoolForCourse,
  pickRandomSyllable,
} from '@/src/utils/hangulPuzzleScope';
import { useWordsStore } from '@/src/store/wordsStore';
import { useSubscriptionStore } from '@/src/store/subscriptionStore';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { triggerSelectionHaptic } from '@/src/utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G } from 'react-native-svg';
import { spacing, radius, hexToRgba, GLASS_CARD_OPACITY } from '@/src/theme';
import { getSettingsFlowTokens, PAD, CONTENT_W } from '@/src/theme/settingsFlowTokens';
import {
  playCorrectSound,
  playIncorrectSound,
  playStartSound,
  getConfiguredSpeechVolume,
  QUIZ_START_SPEECH_DELAY_MS,
} from '@/src/utils/quizSoundEffects';
import {
  preloadGeneratedWordSpeech,
  speakWordWithGeneratedFallback,
  stopGeneratedWordSpeechPlayback,
} from '@/src/utils/generatedWordSpeech';
import { useProfileStore } from '@/src/store/profileStore';
import { getHangulPuzzleStrings } from '@/src/i18n/flowScreens';
import type { PuzzleCourse } from './index';

const QUESTION_COUNT = 10;
const OPTIONS_PER_SLOT = 8;

type Question = { syllable: string };

function buildQuestions(count: number, course: PuzzleCourse): Question[] {
  const pool = getSyllablePoolForCourse(course);
  const list: Question[] = [];
  const seen = new Set<string>();
  while (list.length < count) {
    const syllable = pickRandomSyllable(course, pool);
    const d = decompose(syllable);
    if (course === 'batchim') {
      if (!d || !SINGLE_JONG.includes(d.jong)) continue;
    }
    if (course === 'batchim2') {
      if (!d || !DOUBLE_JONG.includes(d.jong)) continue;
    }
    if (pool.length >= count && seen.has(syllable)) continue;
    seen.add(syllable);
    list.push({ syllable });
  }
  return list;
}

const FREE_PUZZLE_COURSE_ID: PuzzleCourse = 'basic';

export default function HangulPuzzlePlayScreen() {
  const { resolvedMode } = useTheme();
  const { colors, typography, cardShadow, cardBorder, flowShadow: SHADOW } = useThemeStyles();
  const router = useRouter();
  const isSubscribed = useSubscriptionStore((s) => s.isSubscribed);
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const pt = useMemo(
    () => getHangulPuzzleStrings(displayLanguage),
    [displayLanguage]
  );
  const params = useLocalSearchParams<{ course?: string }>();
  const course = (params.course === 'basic' || params.course === 'batchim' || params.course === 'batchim2' || params.course === 'tensed' || params.course === 'mixed'
    ? params.course
    : 'basic') as PuzzleCourse;

  useEffect(() => {
    if (course !== FREE_PUZZLE_COURSE_ID && !isSubscribed) {
      router.replace('/subscription');
    }
  }, [course, isSubscribed, router]);

  const TOKEN = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        centered: { justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
        header: {
          paddingHorizontal: PAD,
          paddingBottom: 12,
          backgroundColor: TOKEN.surface,
          borderBottomWidth: 1,
          borderBottomColor: TOKEN.border,
          zIndex: 10,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: CONTENT_W,
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
          fontSize: 18,
          fontWeight: '700',
          color: TOKEN.ink,
          letterSpacing: -0.3,
          flex: 1,
          textAlign: 'center',
        },
        headerRight: { minWidth: 56, alignItems: 'flex-end' },
        headerCorrect: { ...typography.caption, color: TOKEN.inkMuted, fontWeight: '600' },
        progressRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12, width: CONTENT_W, alignSelf: 'center' },
        progressBarBg: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
        progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
        headerCount: { ...typography.caption, color: TOKEN.inkMuted },
        scroll: { flex: 1 },
        scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
        emoji: { fontSize: 48, marginBottom: spacing.md, textAlign: 'center' },
        title: { ...typography.section, marginBottom: spacing.sm, textAlign: 'center' },
        sub: { ...typography.bodySmall, textAlign: 'center' },
        targetCard: {
          backgroundColor: hexToRgba(colors.card, GLASS_CARD_OPACITY),
          borderRadius: radius.xl,
          padding: spacing.lg,
          marginBottom: spacing.xl,
          alignItems: 'center',
          ...cardBorder,
        },
        targetTitle: { ...typography.body, marginBottom: spacing.md, textAlign: 'center' },
        targetRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
        targetSyllable: { fontSize: 56, fontWeight: '700', color: colors.text },
        readingPill: {
          backgroundColor: hexToRgba(colors.primary, 0.125),
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.xl,
        },
        readingText: { ...typography.bodySmall, color: colors.primary },
        sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
        sectionLabel: { ...typography.section, marginBottom: spacing.sm },
        sectionLabelInRow: { marginBottom: 0 },
        speakerBtnSection: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.xl,
          backgroundColor: hexToRgba(colors.card, GLASS_CARD_OPACITY),
          ...cardBorder,
        },
        speakerBtnSectionPressed: { opacity: 0.8 },
        speakerBtnLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
        buildRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: spacing.xl,
          gap: spacing.sm,
        },
        /** 1スロット＝ボックス＋その下のラベルピル */
        slotColumn: { alignItems: 'center' },
        slotPlusWrap: {
          height: 56,
          justifyContent: 'center',
          alignItems: 'center',
        },
        slotBox: {
          width: 56,
          height: 56,
          borderRadius: radius.md,
          borderWidth: 2,
          borderStyle: 'dashed',
          justifyContent: 'center',
          alignItems: 'center',
        },
        slotMoeum: { borderColor: colors.primary },
        slotJaeum: { borderColor: colors.accent },
        slotBatchim: { borderColor: colors.textSecondary },
        slotResult: { borderColor: colors.primary, borderStyle: 'solid' },
        slotResultCorrect: { borderColor: colors.correct, backgroundColor: hexToRgba(colors.correct, 0.09) },
        slotResultWrong: { borderColor: colors.wrong, backgroundColor: hexToRgba(colors.wrong, 0.09) },
        slotChar: { fontSize: 28, fontWeight: '700', color: colors.text },
        slotPlus: { fontSize: 18, color: colors.textSecondary },
        slotEquals: { fontSize: 18, color: colors.textSecondary },
        /** スロット直下の子音・母音・パッチムラベル（ボックスと重ねない） */
        pillBelow: {
          marginTop: spacing.xs,
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          minHeight: 22,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pill: {
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          minHeight: 22,
          borderRadius: radius.sm,
          alignSelf: 'center',
          justifyContent: 'center',
        },
        pillMoeum: { backgroundColor: colors.primary },
        pillJaeum: { backgroundColor: colors.accent },
        pillBatchim: {
          backgroundColor: colors.textSecondary,
          paddingVertical: 2,
          paddingHorizontal: 6,
        },
        pillInline: { position: 'relative', bottom: 0, marginBottom: spacing.sm },
        pillText: { fontSize: 11, fontWeight: '600', color: colors.onPrimary },
        pillTextBatchim: { fontSize: 12, fontWeight: '600', color: colors.onPrimary },
        feedbackBanner: { padding: spacing.lg, borderRadius: radius.xl, marginBottom: spacing.lg, alignItems: 'center' },
        feedbackCorrect: { backgroundColor: hexToRgba(colors.correct, 0.13) },
        feedbackWrong: { backgroundColor: hexToRgba(colors.wrong, 0.13) },
        feedbackText: { fontSize: 20, fontWeight: '700', color: colors.text },
        feedbackSub: { ...typography.bodySmall, marginTop: spacing.xs },
        feedbackActions: {
          flexDirection: 'row',
          gap: spacing.md,
          marginTop: spacing.md,
          alignItems: 'center',
        },
        feedbackButtonPrimary: {
          backgroundColor: colors.primary,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          minHeight: 44,
          borderRadius: radius.xl,
          justifyContent: 'center',
          alignItems: 'center',
        },
        feedbackButtonTextPrimary: { fontSize: 16, fontWeight: '600', color: colors.onPrimary },
        feedbackButtonSecondary: {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          minHeight: 44,
          borderRadius: radius.xl,
          justifyContent: 'center',
          alignItems: 'center',
        },
        feedbackButtonTextSecondary: { fontSize: 16, fontWeight: '600', color: colors.text },
        jamoGrid: { width: '100%' },
        jamoGridRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
        jamoTile: {
          flex: 1,
          aspectRatio: 1,
          minWidth: 0,
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: radius.md,
          borderWidth: 2,
          paddingVertical: spacing.sm,
        },
        jamoBtnMoeum: { borderColor: colors.primary, backgroundColor: hexToRgba(colors.primary, 0.07) },
        jamoBtnJaeum: { borderColor: colors.accent, backgroundColor: hexToRgba(colors.accent, 0.07) },
        jamoBtnBatchim: { borderColor: colors.textSecondary, backgroundColor: colors.background },
        jamoBtnSelected: { backgroundColor: hexToRgba(colors.primary, 0.15), borderColor: colors.primary },
        jamoBtnDisabled: { opacity: 0.7 },
        jamoTileChar: { fontSize: 28, fontWeight: '700', color: colors.text },
        jamoTileRoman: { ...typography.caption, marginTop: 2, color: colors.textSecondary },
        resultScore: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.xl },
        primaryButton: {
          backgroundColor: colors.primary,
          paddingVertical: spacing.md,
          borderRadius: radius.xl,
          alignItems: 'center',
        },
        primaryButtonText: { fontSize: 17, fontWeight: '600', color: colors.onPrimary },
        secondaryButton: {
          paddingVertical: spacing.md,
          borderRadius: radius.xl,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
        },
        secondaryButtonText: { ...typography.body },
        tertiaryButton: { paddingVertical: spacing.md, borderRadius: radius.xl, alignItems: 'center', marginTop: spacing.xs },
        tertiaryButtonText: { ...typography.bodySmall },
        backButton: { marginTop: spacing.lg, paddingVertical: spacing.sm },
        backButtonText: { ...typography.body, color: colors.primary },
        resultHeaderFixed: {
          paddingHorizontal: PAD,
          alignItems: 'center',
          backgroundColor: TOKEN.surface,
          borderBottomWidth: 1,
          borderBottomColor: TOKEN.border,
          paddingBottom: 16,
        },
        resultCard: {
          backgroundColor: hexToRgba(colors.card, GLASS_CARD_OPACITY),
          borderRadius: radius.xl,
          paddingVertical: spacing.xxl,
          paddingHorizontal: spacing.xxl,
          marginBottom: spacing.lg,
          width: CONTENT_W,
          maxWidth: '100%',
          alignItems: 'center',
          ...cardBorder,
          ...cardShadow,
        },
        resultLabel: { ...typography.body, color: colors.textSecondary },
        percentWrap: { marginTop: spacing.xl, alignItems: 'center' },
        percentLabel: { ...typography.caption, color: TOKEN.inkMuted, marginBottom: 12 },
        circleWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
        circleSvg: { position: 'absolute' as const },
        percentValue: { fontSize: 28, fontWeight: '800' as const, color: colors.text },
        percentUnit: { fontSize: 14, fontWeight: '700' as const, color: TOKEN.inkMuted },
        countCaption: { ...typography.caption, color: TOKEN.inkMuted, marginTop: 10 },
        resultActions: { width: '100%', maxWidth: CONTENT_W, gap: spacing.sm },
        resultPrimaryButton: { borderRadius: radius.xl, overflow: 'hidden' as const, height: 52, width: '100%' },
        resultPrimaryGradient: { height: 52, justifyContent: 'center' as const, alignItems: 'center' as const },
        resultPrimaryButtonText: { fontSize: 17, fontWeight: '600' as const, color: colors.onPrimary },
        resultRowButton: {
          flexDirection: 'row' as const,
          alignItems: 'center',
          justifyContent: 'center',
          height: 52,
          width: '100%',
          backgroundColor: TOKEN.surface,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: TOKEN.border,
          ...SHADOW,
        },
        resultRowButtonPressed: { opacity: 0.9 },
        resultRowButtonText: { ...typography.body, color: TOKEN.ink, fontWeight: '600' as const },
        resultRowButtonIcon: { marginRight: 8 },
      }),
    [colors, typography, cardBorder, cardShadow, TOKEN, SHADOW]
  );

  const { headerPaddingTop, footerPaddingBottom } = useSafeArea();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCho, setSelectedCho] = useState<number | null>(null);
  const [selectedJung, setSelectedJung] = useState<number | null>(null);
  const [selectedJong, setSelectedJong] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [phase, setPhase] = useState<'ready' | 'quiz' | 'result'>('ready');
  const [startKey, setStartKey] = useState(0);
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);

  const wordsLoaded = useWordsStore((s) => s.wordsLoadedFromSupabase);
  const wordsContentLocale = useWordsStore((s) => s.wordsContentLocale);
  const questionsReady = useMemo(
    () => buildQuestions(QUESTION_COUNT, course),
    [startKey, course, wordsLoaded, wordsContentLocale]
  );

  useEffect(() => {
    if (questionsReady.length > 0 && phase === 'ready') {
      setQuestions(questionsReady);
      setCurrentIndex(0);
      setCorrectCount(0);
      setSelectedCho(null);
      setSelectedJung(null);
      setSelectedJong(null);
      setWaiting(false);
      setLastResult(null);
      setPhase('quiz');
    }
  }, [questionsReady, phase]);

  const currentQuestion = questions[currentIndex];
  const targetInfo = currentQuestion ? decompose(currentQuestion.syllable) : null;
  const hasPatchim = targetInfo != null && targetInfo.jong !== 0;

  const nextSyllable = questions[currentIndex + 1]?.syllable;

  useEffect(() => {
    return () => {
      void stopGeneratedWordSpeechPlayback();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'quiz' || !currentQuestion?.syllable) return;
    void preloadGeneratedWordSpeech('word', currentQuestion.syllable);
    if (nextSyllable) void preloadGeneratedWordSpeech('word', nextSyllable);
    const delay = currentIndex === 0 ? QUIZ_START_SPEECH_DELAY_MS : 0;
    const timer = setTimeout(() => {
      void speakWordWithGeneratedFallback('word', currentQuestion.syllable, {
        language: 'ko-KR',
        rate: 0.9,
        volume: getConfiguredSpeechVolume(),
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [phase, currentIndex, currentQuestion?.syllable, nextSyllable]);

  const step = selectedCho === null ? 0 : selectedJung === null ? 1 : 2;

  const choOptions = useMemo(
    () => (targetInfo ? getChoOptionsForCourse(targetInfo.cho, OPTIONS_PER_SLOT, course) : []),
    [currentQuestion?.syllable, course]
  );
  const jungOptions = useMemo(
    () => (targetInfo ? getOptionsFromPool(targetInfo.jung, COMMON_JUNG, OPTIONS_PER_SLOT) : []),
    [currentQuestion?.syllable]
  );
  const jongOptions = useMemo(
    () =>
      targetInfo
        ? getOptionsFromPool(
            targetInfo.jong,
            getJongPoolForCourse(course),
            OPTIONS_PER_SLOT
          )
        : [],
    [currentQuestion?.syllable, course]
  );

  const canCheck =
    selectedCho !== null &&
    selectedJung !== null &&
    (hasPatchim ? selectedJong !== null : true);

  useEffect(() => {
    if (hasPatchim || !currentQuestion || !canCheck || waiting) return;
    const built = build(selectedCho!, selectedJung!, 0);
    const isCorrect = built === currentQuestion.syllable;
    setLastResult(isCorrect ? 'correct' : 'wrong');
    setWaiting(true);
    if (isCorrect) void playCorrectSound();
    else void playIncorrectSound();
    if (isCorrect) setCorrectCount((c) => c + 1);
    if (isCorrect) {
      const t = setTimeout(() => {
        if (currentIndex + 1 >= questions.length) setPhase('result');
        else {
          setCurrentIndex((i) => i + 1);
          setSelectedCho(null);
          setSelectedJung(null);
          setSelectedJong(null);
          setWaiting(false);
          setLastResult(null);
        }
      }, 900);
      return () => clearTimeout(t);
    }
  }, [canCheck, selectedCho, selectedJung, hasPatchim]);

  useEffect(() => {
    if (!hasPatchim || !currentQuestion || !canCheck || waiting || selectedJong === null) return;
    const built = build(selectedCho!, selectedJung!, selectedJong);
    const isCorrect = built === currentQuestion.syllable;
    setLastResult(isCorrect ? 'correct' : 'wrong');
    setWaiting(true);
    if (isCorrect) void playCorrectSound();
    else void playIncorrectSound();
    if (isCorrect) setCorrectCount((c) => c + 1);
    if (isCorrect) {
      const t = setTimeout(() => {
        if (currentIndex + 1 >= questions.length) setPhase('result');
        else {
          setCurrentIndex((i) => i + 1);
          setSelectedCho(null);
          setSelectedJung(null);
          setSelectedJong(null);
          setWaiting(false);
          setLastResult(null);
        }
      }, 900);
      return () => clearTimeout(t);
    }
  }, [canCheck, selectedCho, selectedJung, selectedJong, hasPatchim]);

  const goNextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setPhase('result');
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedCho(null);
      setSelectedJung(null);
      setSelectedJong(null);
      setWaiting(false);
      setLastResult(null);
    }
  };

  const retrySameQuestion = () => {
    setSelectedCho(null);
    setSelectedJung(null);
    setSelectedJong(null);
    setWaiting(false);
    setLastResult(null);
  };

  const clearCho = () => {
    if (waiting || selectedCho === null) return;
    setSelectedCho(null);
    setSelectedJung(null);
    setSelectedJong(null);
  };
  const clearJung = () => {
    if (waiting || selectedJung === null) return;
    setSelectedJung(null);
    setSelectedJong(null);
  };
  const clearJong = () => {
    if (waiting || selectedJong === null) return;
    setSelectedJong(null);
  };

  const handleSpeak = () => {
    if (!currentQuestion?.syllable) return;
    void speakWordWithGeneratedFallback('word', currentQuestion.syllable, {
      language: 'ko-KR',
      rate: 0.9,
      volume: getConfiguredSpeechVolume(),
    });
  };

  const handleSelectCho = (idx: number) => {
    if (waiting) return;
    void triggerSelectionHaptic();
    setSelectedCho(idx);
  };
  const handleSelectJung = (idx: number) => {
    if (waiting) return;
    void triggerSelectionHaptic();
    setSelectedJung(idx);
  };
  const handleSelectJong = (idx: number) => {
    if (waiting) return;
    void triggerSelectionHaptic();
    setSelectedJong(idx);
  };

  const handleStart = () => {
    void playStartSound();
    setStartKey((k) => k + 1);
    setPhase('ready');
    setQuestions([]);
  };

  const handleQuitPress = () => {
    Alert.alert(
      pt.quitTitle,
      undefined,
      [
        { text: pt.quitCancel, style: 'cancel' },
        { text: pt.quitConfirm, style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  if (phase === 'result') {
    const total = questions.length;
    const isClear = total > 0 && correctCount === total;
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const goToCourseList = () => router.replace('/(tabs)/vocabulary/puzzle');
    return (
      <View style={styles.container}>
        <View style={[styles.resultHeaderFixed, { paddingTop: headerPaddingTop }]}>
          <View style={styles.headerRow}>
            <Pressable
              style={({ pressed }) => [styles.headerCircleBtn, pressed && { opacity: 0.8 }]}
              onPress={goToCourseList}
              accessibilityLabel={pt.backToCoursesA11y}
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={22} color={TOKEN.ink} />
            </Pressable>
            <Text style={styles.headerTitle}>{pt.resultTitle}</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            paddingHorizontal: PAD,
            paddingTop: spacing.xxl,
            paddingBottom: footerPaddingBottom + spacing.xl,
          }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>{isClear ? pt.resultClear : pt.resultEncourage}</Text>
            {total > 0 && (
              <View style={styles.percentWrap}>
                <Text style={styles.percentLabel}>{pt.accuracyLabel}</Text>
                <View style={styles.circleWrap}>
                  <Svg width={120} height={120} style={styles.circleSvg}>
                    <Circle cx={60} cy={60} r={52} stroke={TOKEN.border} strokeWidth={10} fill="transparent" />
                    <G rotation={-90} originX={60} originY={60}>
                      <Circle
                        cx={60}
                        cy={60}
                        r={52}
                        stroke={percent >= 100 ? colors.correct : colors.primary}
                        strokeWidth={10}
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 52}
                        strokeDashoffset={2 * Math.PI * 52 * (1 - percent / 100)}
                        strokeLinecap="round"
                      />
                    </G>
                  </Svg>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={styles.percentValue}>{percent}</Text>
                    <Text style={styles.percentUnit}>%</Text>
                  </View>
                </View>
                <Text style={styles.countCaption}>{pt.scoreLine(correctCount, total)}</Text>
              </View>
            )}
          </View>
          <View style={styles.resultActions}>
            <Pressable
              style={({ pressed }) => [styles.resultPrimaryButton, pressed && { opacity: 0.9 }]}
              onPress={handleStart}
              accessibilityLabel={pt.tryAgainA11y}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.resultPrimaryGradient}
              >
                <Text style={styles.resultPrimaryButtonText}>{pt.playAgain}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.resultRowButton, pressed && styles.resultRowButtonPressed]}
              onPress={goToCourseList}
              accessibilityLabel={pt.toCoursesA11y}
              accessibilityRole="button"
            >
              <Ionicons name="list-outline" size={22} color={TOKEN.ink} style={styles.resultRowButtonIcon} />
              <Text style={styles.resultRowButtonText}>{pt.toCourseList}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.resultRowButton, pressed && styles.resultRowButtonPressed]}
              onPress={() => router.replace('/(tabs)/vocabulary')}
              accessibilityLabel={pt.toVocabTabA11y}
              accessibilityRole="button"
            >
              <Ionicons name="home-outline" size={22} color={TOKEN.ink} style={styles.resultRowButtonIcon} />
              <Text style={styles.resultRowButtonText}>{pt.toVocabTab}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!currentQuestion || !targetInfo) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: headerPaddingTop }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;
  const builtSyllable =
    selectedCho !== null && selectedJung !== null && (!hasPatchim || selectedJong !== null)
      ? build(selectedCho, selectedJung, hasPatchim ? selectedJong! : 0)
      : null;

  const showFeedback = lastResult !== null;
  const stepSelectHint = step === 0 ? pt.selectCho : step === 1 ? pt.selectJung : pt.selectJong;
  const stepPillStyle = step === 0 ? styles.pillJaeum : step === 1 ? styles.pillMoeum : styles.pillBatchim;

  return (
    <View style={styles.container}>
      <View
        style={[styles.header, { paddingTop: headerPaddingTop }]}
        accessibilityRole="header"
        accessibilityLabel={pt.headerProgressA11y(currentIndex + 1, questions.length)}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.headerCircleBtn, pressed && { opacity: 0.8 }]}
            onPress={handleQuitPress}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityLabel={pt.closeQuizA11y}
            accessibilityRole="button"
          >
            <Ionicons name="close" size={22} color={TOKEN.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{pt.playTitle}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.headerCorrect}>{pt.correctCount(correctCount)}</Text>
          </View>
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.headerCount}>{currentIndex + 1} / {questions.length}</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: footerPaddingBottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.targetCard}>
          <Text style={styles.targetTitle}>{pt.buildSyllablePrompt}</Text>
          <View style={styles.targetRow}>
            <Text style={styles.targetSyllable}>{currentQuestion.syllable}</Text>
          </View>
          <View style={styles.readingPill}>
            <Text style={styles.readingText}>{syllableToRomanization(currentQuestion.syllable)}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>{pt.assemblingHint}</Text>
        <View style={styles.buildRow}>
          <View style={styles.slotColumn}>
            <Pressable
              onPress={clearCho}
              style={[styles.slotBox, styles.slotJaeum]}
              accessibilityLabel={pt.redoChoA11y}
              accessibilityRole="button"
            >
              <Text style={styles.slotChar}>
                {selectedCho !== null ? CHO_LIST[selectedCho] : '?'}
              </Text>
            </Pressable>
            <View style={[styles.pillBelow, styles.pillJaeum]}>
              <Text style={styles.pillText}>{pt.labelCho}</Text>
            </View>
          </View>
          <View style={styles.slotPlusWrap}>
            <Text style={styles.slotPlus}>+</Text>
          </View>
          <View style={styles.slotColumn}>
            <Pressable
              onPress={clearJung}
              style={[styles.slotBox, styles.slotMoeum]}
              accessibilityLabel={pt.redoJungA11y}
              accessibilityRole="button"
            >
              <Text style={styles.slotChar}>
                {selectedJung !== null ? JUNG_LIST[selectedJung] : '?'}
              </Text>
            </Pressable>
            <View style={[styles.pillBelow, styles.pillMoeum]}>
              <Text style={styles.pillText}>{pt.labelJung}</Text>
            </View>
          </View>
          {hasPatchim && (
            <>
              <View style={styles.slotPlusWrap}>
                <Text style={styles.slotPlus}>+</Text>
              </View>
              <View style={styles.slotColumn}>
                <Pressable
                  onPress={clearJong}
                  style={[styles.slotBox, styles.slotBatchim]}
                  accessibilityLabel={pt.redoJongA11y}
                  accessibilityRole="button"
                >
                  <Text style={styles.slotChar} numberOfLines={1} adjustsFontSizeToFit>
                    {selectedJong !== null
                      ? selectedJong === 0
                        ? '－'
                        : JONG_LIST[selectedJong]
                      : '?'}
                  </Text>
                </Pressable>
                <View style={[styles.pillBelow, styles.pillBatchim]}>
                  <Text style={[styles.pillText, styles.pillTextBatchim]} numberOfLines={1} adjustsFontSizeToFit>
                    {pt.labelJong}
                  </Text>
                </View>
              </View>
            </>
          )}
          <View style={styles.slotPlusWrap}>
            <Text style={styles.slotEquals}>=</Text>
          </View>
          <View style={styles.slotColumn}>
            <View
              style={[
                styles.slotBox,
                styles.slotResult,
                showFeedback && lastResult === 'correct' && styles.slotResultCorrect,
                showFeedback && lastResult === 'wrong' && styles.slotResultWrong,
              ]}
            >
              <Text style={styles.slotChar}>{builtSyllable ?? '?'}</Text>
            </View>
          </View>
        </View>

        {showFeedback && (
          <View
            style={[
              styles.feedbackBanner,
              lastResult === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong,
            ]}
          >
            <Text style={styles.feedbackText}>
              {lastResult === 'correct' ? pt.feedbackCorrect : pt.feedbackWrong}
            </Text>
            {lastResult === 'wrong' && (
              <Text style={styles.feedbackSub}>{pt.feedbackAnswer(currentQuestion.syllable)}</Text>
            )}
            {lastResult === 'correct' && (
              <Text style={styles.feedbackSub}>{pt.feedbackNext}</Text>
            )}
            {lastResult === 'wrong' && (
              <View style={styles.feedbackActions}>
                <Pressable style={styles.feedbackButtonSecondary} onPress={retrySameQuestion} accessibilityLabel={pt.tryAgain} accessibilityRole="button">
                  <Text style={styles.feedbackButtonTextSecondary}>{pt.tryAgain}</Text>
                </Pressable>
                <Pressable style={styles.feedbackButtonPrimary} onPress={goNextQuestion} accessibilityLabel={pt.nextQuestion} accessibilityRole="button">
                  <Text style={styles.feedbackButtonTextPrimary}>{pt.nextQuestion}</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {!showFeedback && (
          <>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionLabel, styles.sectionLabelInRow]}>{pt.pickChars}</Text>
              <Pressable
                onPress={handleSpeak}
                style={({ pressed }) => [styles.speakerBtnSection, pressed && styles.speakerBtnSectionPressed]}
                accessibilityLabel={pt.pronounceA11y}
                accessibilityRole="button"
              >
                <Ionicons name="volume-high-outline" size={22} color={colors.primary} />
                <Text style={styles.speakerBtnLabel}>{pt.pronounce}</Text>
              </Pressable>
            </View>
            <View style={[styles.pill, stepPillStyle, styles.pillInline]}>
              <Text style={styles.pillText}>{stepSelectHint}</Text>
            </View>
            <View style={styles.jamoGrid}>
              {step === 0 && (
                <>
                  <View style={styles.jamoGridRow}>
                    {choOptions.slice(0, 4).map((idx) => (
                      <Pressable
                        key={`cho-${idx}`}
                        style={[
                          styles.jamoTile,
                          styles.jamoBtnJaeum,
                          selectedCho === idx && styles.jamoBtnSelected,
                          waiting && styles.jamoBtnDisabled,
                        ]}
                        onPress={() => handleSelectCho(idx)}
                        disabled={waiting}
                        accessibilityLabel={pt.a11yCho(CHO_LIST[idx], CHO_ROMANIZATION[idx])}
                        accessibilityRole="button"
                      >
                        <Text style={styles.jamoTileChar}>{CHO_LIST[idx]}</Text>
                        <Text style={styles.jamoTileRoman}>{CHO_ROMANIZATION[idx]}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.jamoGridRow}>
                    {choOptions.slice(4, 8).map((idx) => (
                      <Pressable
                        key={`cho-${idx}`}
                        style={[
                          styles.jamoTile,
                          styles.jamoBtnJaeum,
                          selectedCho === idx && styles.jamoBtnSelected,
                          waiting && styles.jamoBtnDisabled,
                        ]}
                        onPress={() => handleSelectCho(idx)}
                        disabled={waiting}
                        accessibilityLabel={pt.a11yCho(CHO_LIST[idx], CHO_ROMANIZATION[idx])}
                        accessibilityRole="button"
                      >
                        <Text style={styles.jamoTileChar}>{CHO_LIST[idx]}</Text>
                        <Text style={styles.jamoTileRoman}>{CHO_ROMANIZATION[idx]}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
              {step === 1 && (
                <>
                  <View style={styles.jamoGridRow}>
                    {jungOptions.slice(0, 4).map((idx) => (
                      <Pressable
                        key={`jung-${idx}`}
                        style={[
                          styles.jamoTile,
                          styles.jamoBtnMoeum,
                          selectedJung === idx && styles.jamoBtnSelected,
                          waiting && styles.jamoBtnDisabled,
                        ]}
                        onPress={() => handleSelectJung(idx)}
                        disabled={waiting}
                        accessibilityLabel={pt.a11yJung(JUNG_LIST[idx], JUNG_ROMANIZATION[idx])}
                        accessibilityRole="button"
                      >
                        <Text style={styles.jamoTileChar}>{JUNG_LIST[idx]}</Text>
                        <Text style={styles.jamoTileRoman}>{JUNG_ROMANIZATION[idx]}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.jamoGridRow}>
                    {jungOptions.slice(4, 8).map((idx) => (
                      <Pressable
                        key={`jung-${idx}`}
                        style={[
                          styles.jamoTile,
                          styles.jamoBtnMoeum,
                          selectedJung === idx && styles.jamoBtnSelected,
                          waiting && styles.jamoBtnDisabled,
                        ]}
                        onPress={() => handleSelectJung(idx)}
                        disabled={waiting}
                        accessibilityLabel={pt.a11yJung(JUNG_LIST[idx], JUNG_ROMANIZATION[idx])}
                        accessibilityRole="button"
                      >
                        <Text style={styles.jamoTileChar}>{JUNG_LIST[idx]}</Text>
                        <Text style={styles.jamoTileRoman}>{JUNG_ROMANIZATION[idx]}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
              {hasPatchim && step === 2 && (
                <>
                  <View style={styles.jamoGridRow}>
                    {jongOptions.slice(0, 4).map((idx) => (
                      <Pressable
                        key={`jong-${idx}`}
                        style={[
                          styles.jamoTile,
                          styles.jamoBtnBatchim,
                          selectedJong === idx && styles.jamoBtnSelected,
                          waiting && styles.jamoBtnDisabled,
                        ]}
                        onPress={() => handleSelectJong(idx)}
                        disabled={waiting}
                        accessibilityLabel={
                          idx === 0
                            ? pt.a11yJongNone
                            : pt.a11yJong(JONG_LIST[idx], JONG_ROMANIZATION[idx])
                        }
                        accessibilityRole="button"
                      >
                        <Text style={styles.jamoTileChar}>{idx === 0 ? '－' : JONG_LIST[idx]}</Text>
                        <Text style={styles.jamoTileRoman}>{JONG_ROMANIZATION[idx]}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.jamoGridRow}>
                    {jongOptions.slice(4, 8).map((idx) => (
                      <Pressable
                        key={`jong-${idx}`}
                        style={[
                          styles.jamoTile,
                          styles.jamoBtnBatchim,
                          selectedJong === idx && styles.jamoBtnSelected,
                          waiting && styles.jamoBtnDisabled,
                        ]}
                        onPress={() => handleSelectJong(idx)}
                        disabled={waiting}
                        accessibilityLabel={
                          idx === 0
                            ? pt.a11yJongNone
                            : pt.a11yJong(JONG_LIST[idx], JONG_ROMANIZATION[idx])
                        }
                        accessibilityRole="button"
                      >
                        <Text style={styles.jamoTileChar}>{idx === 0 ? '－' : JONG_LIST[idx]}</Text>
                        <Text style={styles.jamoTileRoman}>{JONG_ROMANIZATION[idx]}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
