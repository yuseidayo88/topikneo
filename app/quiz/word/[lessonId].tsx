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
import { Ionicons } from '@expo/vector-icons';
import { getWordsByLessonId, getWrongMeaningOptions } from '@/src/data/words';
import * as db from '@/src/db/database';
import { createCard, calculateNextReview, getNextReviewDate } from '@/src/utils/sm2';
import { useProgressStore } from '@/src/store/progressStore';
import { useWordsStore } from '@/src/store/wordsStore';
import { useProfileStore } from '@/src/store/profileStore';
import { useSubscriptionStore } from '@/src/store/subscriptionStore';
import { FREE_LESSONS_PER_LEVEL } from '@/src/store/subscriptionStore';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { getQuizStrings } from '@/src/i18n/quiz';
import { getNavigationTitles } from '@/src/i18n/appScreens';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { triggerSelectionHaptic } from '@/src/utils/haptics';
import { spacing, radius, hexToRgba, GLASS_CARD_OPACITY, SAVED_STAR_YELLOW } from '@/src/theme';
import { getSettingsFlowTokens, PAD as HEADER_PAD, CONTENT_W as HEADER_CONTENT_W } from '@/src/theme/settingsFlowTokens';
import {
  playCorrectSound,
  playIncorrectSound,
  getConfiguredSpeechVolume,
  QUIZ_START_SPEECH_DELAY_MS,
} from '@/src/utils/quizSoundEffects';
import {
  preloadGeneratedWordSpeech,
  speakWordWithGeneratedFallback,
  stopGeneratedWordSpeechPlayback,
} from '@/src/utils/generatedWordSpeech';

export default function WordQuizScreen() {
  const { resolvedMode } = useTheme();
  const { colors, typography, cardBorder, flowShadow: SHADOW } = useThemeStyles();
  const TOKEN = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();
  const isSubscribed = useSubscriptionStore((s) => s.isSubscribed);
  const refresh = useProgressStore((s) => s.refresh);
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const uiLoc = displayLanguage;
  const t = useMemo(() => getQuizStrings(uiLoc), [displayLanguage]);
  const nav = useMemo(() => getNavigationTitles(uiLoc), [displayLanguage]);
  const { headerPaddingTop, footerPaddingBottom } = useSafeArea();
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
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: HEADER_CONTENT_W,
          alignSelf: 'center',
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
        wordCard: {
          backgroundColor: hexToRgba(colors.card, GLASS_CARD_OPACITY),
          borderRadius: 22,
          paddingVertical: spacing.xxl,
          paddingHorizontal: spacing.xl,
          width: '100%',
          alignItems: 'center',
          ...cardBorder,
        },
        verticalGap: { height: spacing.xl },
        optionsSpacer: { flex: 1 },
        korean: { fontSize: 36, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
        reading: { fontSize: 15, fontWeight: '500', color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
        actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
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
        options: { gap: spacing.md + 2 },
        option: { minHeight: 52, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
        optionPressed: { opacity: 0.85 },
        optionText: { ...typography.body, lineHeight: 22 },
        optionTextWhite: { color: colors.onPrimary, fontWeight: '600' },
        centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
      }),
    [colors, typography, cardBorder, TOKEN, SHADOW]
  );

  const handleQuitPress = () => {
    Alert.alert(
      t.quitConfirmTitle,
      undefined,
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.quit, style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  const wordsLoaded = useWordsStore((s) => s.wordsLoadedFromSupabase);
  /** 表示言語切替後も wordsLoaded が true のままなので、ロケールが変わったら単語配列を取り直す */
  const wordsContentLocale = useWordsStore((s) => s.wordsContentLocale);
  const words = useMemo(() => getWordsByLessonId(lessonId ?? ''), [lessonId, wordsLoaded, wordsContentLocale, displayLanguage]);
  const [order, setOrder] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [initDone, setInitDone] = useState(false);
  const resultsByWordIdRef = useRef<Record<string, boolean>>({});

  const currentWord = order.length > 0 ? words[order[currentIndex]] : null;

  useEffect(() => {
    if (currentWord) setSaved(db.isWordSaved(currentWord.id));
  }, [currentWord]);

  useEffect(() => {
    return () => {
      void stopGeneratedWordSpeechPlayback();
    };
  }, []);

  useEffect(() => {
    if (!currentWord?.korean) return;
    const nextWord = order.length > currentIndex + 1 ? words[order[currentIndex + 1]] : null;
    void preloadGeneratedWordSpeech('word', currentWord.korean);
    if (nextWord?.korean) void preloadGeneratedWordSpeech('word', nextWord.korean);
    const delay = currentIndex === 0 ? QUIZ_START_SPEECH_DELAY_MS : 0;
    const timer = setTimeout(() => {
      void speakWordWithGeneratedFallback('word', currentWord.korean, {
        language: 'ko-KR',
        rate: 0.9,
        volume: getConfiguredSpeechVolume(),
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [currentWord?.id, currentIndex, order, words]);

  const handleToggleSaved = () => {
    if (!currentWord) return;
    void triggerSelectionHaptic();
    const nowSaved = db.toggleSavedWord(currentWord.id);
    setSaved(nowSaved);
  };

  const handleSpeak = () => {
    if (!currentWord?.korean) return;
    void speakWordWithGeneratedFallback('word', currentWord.korean, {
      language: 'ko-KR',
      rate: 0.9,
      volume: getConfiguredSpeechVolume(),
    });
  };
  const uiLocale = displayLanguage;
  const options = useMemo(() => {
    if (!currentWord) return [];
    const wrong = getWrongMeaningOptions(currentWord.topik_level, lessonId ?? '', currentWord.japanese, 3, uiLocale);
    const all = [currentWord.japanese, ...wrong].sort(() => Math.random() - 0.5);
    return all;
  }, [currentWord, lessonId, uiLocale, wordsContentLocale]);

  const wordLessonNum = useMemo(
    () => parseInt((lessonId ?? '').replace(/^ko_W\d+_/, ''), 10) || 1,
    [lessonId]
  );
  useEffect(() => {
    if (wordLessonNum > FREE_LESSONS_PER_LEVEL && !isSubscribed) {
      router.replace('/subscription');
    }
  }, [wordLessonNum, isSubscribed, router]);

  useEffect(() => {
    if (words.length === 0 || !lessonId) return;
    resultsByWordIdRef.current = {};
    setOrder(words.map((_, i) => i).sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setCorrectCount(0);
    setInitDone(true);
  }, [words.length, lessonId, wordsContentLocale]);

  const handleSelect = (answer: string) => {
    if (waiting || !currentWord) return;
    void triggerSelectionHaptic();
    setSelected(answer);
    setWaiting(true);
    const isCorrect = answer === currentWord.japanese;
    resultsByWordIdRef.current = { ...resultsByWordIdRef.current, [currentWord.id]: isCorrect };
    if (isCorrect) void playCorrectSound();
    else void playIncorrectSound();

    // SM-2 & DB update
    const progress = db.getUserProgressWithCounts(currentWord.id);
    const card = progress
      ? { wordId: currentWord.id, easeFactor: progress.easeFactor, interval: progress.interval, repetitions: progress.repetitions }
      : createCard(currentWord.id);
    const score = isCorrect ? 5 : 0;
    const next = calculateNextReview(card, score);
    const nextDate = getNextReviewDate(next);
    const correctCountNew = (progress?.correctCount ?? 0) + (isCorrect ? 1 : 0);
    const wrongCountNew = (progress?.wrongCount ?? 0) + (isCorrect ? 0 : 1);
    db.upsertUserProgress(currentWord.id, {
      easeFactor: next.easeFactor,
      interval: next.interval,
      repetitions: next.repetitions,
      nextReviewDate: nextDate,
      correctCount: correctCountNew,
      wrongCount: wrongCountNew,
    });
    setCorrectCount((c) => c + (isCorrect ? 1 : 0));

    const delay = isCorrect ? 800 : 1500;
    setTimeout(() => {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= words.length) {
        const totalCorrect = correctCount + (isCorrect ? 1 : 0);
        const resultArray = words.map((w) => (resultsByWordIdRef.current[w.id] === true ? 1 : 0));
        db.saveLessonQuizResult(lessonId!, resultArray);
        if (totalCorrect === words.length) {
          db.setLessonCleared(lessonId!, 'word');
          db.incrementStreak();
          db.addDailyStats(1, totalCorrect);
        } else {
          db.setLessonUncleared(lessonId!, 'word');
        }
        refresh();
        router.replace({
          pathname: '/quiz/result/[lessonId]',
          params: {
            lessonId: lessonId!,
            type: 'word',
            total: String(words.length),
            correct: String(totalCorrect),
          },
        });
      } else {
        setCurrentIndex(nextIndex);
        setSelected(null);
        setWaiting(false);
      }
    }, delay);
  };

  if (words.length === 0) {
    if (!wordsLoaded) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    return (
      <View style={[styles.centered, { paddingHorizontal: 24 }]}>
        <Text style={[typography.body, { color: colors.text, textAlign: 'center', marginBottom: 8 }]}>{t.lessonNotFoundTitle}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }]}>
          {t.lessonNotFoundBody}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          onPress={() => router.back()}
          accessibilityLabel={t.lessonGoBack}
          accessibilityRole="button"
        >
          <Text style={styles.optionText}>{t.lessonGoBack}</Text>
        </Pressable>
      </View>
    );
  }

  if (!initDone) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const progress = order.length > 0 ? (currentIndex + 1) / words.length : 0;

  return (
    <ErrorBoundary contextLabel={nav.quizWord}>
    <View style={styles.container}>
      <View
        style={[styles.header, { paddingTop: headerPaddingTop }]}
        accessibilityRole="header"
        accessibilityLabel={t.quizHeaderA11y(nav.quizWord, currentIndex + 1, words.length)}
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
          <Text style={styles.headerTitle}>{nav.quizWord}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.headerCorrect}>{t.correctScore(correctCount)}</Text>
          </View>
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.headerCount}>{currentIndex + 1} / {words.length}</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      </View>

      <View style={[styles.body, { paddingBottom: footerPaddingBottom + spacing.lg }]}>
        <View style={styles.wordCard}>
          <Text style={styles.korean}>{currentWord?.korean}</Text>
          <Text style={styles.reading}>{currentWord?.reading}</Text>
        </View>
        <View style={styles.verticalGap} />
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={handleToggleSaved}
            accessibilityLabel={saved ? t.removeFromFavorites : t.addToFavorites}
            accessibilityRole="button"
          >
            <Ionicons name={saved ? 'star' : 'star-outline'} size={26} color={saved ? SAVED_STAR_YELLOW : colors.textSecondary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={handleSpeak}
            accessibilityLabel={t.playPronunciation}
            accessibilityRole="button"
          >
            <Ionicons name="volume-high-outline" size={26} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.verticalGap} />
        <View style={styles.optionsSpacer} />
        <View style={styles.options}>
          {options.map((opt, idx) => {
            const isCorrectOption = opt === currentWord?.japanese;
            const isSelectedOption = selected === opt;
            let bg: string = colors.card;
            if (selected) {
              if (isCorrectOption) bg = colors.correct;
              else if (isSelectedOption) bg = colors.wrong;
            }
            const isHighlight = bg === colors.correct || bg === colors.wrong;
            return (
              <Pressable
                key={opt}
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: bg },
                  !selected && pressed && styles.optionPressed,
                ]}
                onPress={() => handleSelect(opt)}
                disabled={!!selected}
                accessibilityLabel={t.optionA11y(idx, opt)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelectedOption, disabled: !!selected }}
              >
                <Text style={[styles.optionText, isHighlight && styles.optionTextWhite]} numberOfLines={2} ellipsizeMode="tail">
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
    </ErrorBoundary>
  );
}
