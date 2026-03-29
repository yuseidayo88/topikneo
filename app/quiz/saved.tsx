import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getWordsByIds, getWrongMeaningOptions } from '@/src/data/words';
import * as db from '@/src/db/database';
import { useWordsStore } from '@/src/store/wordsStore';
import { useProfileStore } from '@/src/store/profileStore';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { getQuizStrings } from '@/src/i18n/quiz';
import { getNavigationTitles } from '@/src/i18n/appScreens';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { triggerLightImpact, triggerSelectionHaptic } from '@/src/utils/haptics';
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

const SAVED_QUIZ_COUNT = 10;

export default function SavedQuizScreen() {
  const { resolvedMode } = useTheme();
  const { colors, typography, cardBorder, flowShadow: SHADOW } = useThemeStyles();
  const router = useRouter();
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const uiLoc = displayLanguage;
  const t = useMemo(() => getQuizStrings(uiLoc), [displayLanguage]);
  const nav = useMemo(() => getNavigationTitles(uiLoc), [displayLanguage]);
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
        emptyCentered: { padding: spacing.xl },
        emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
        emptySub: { ...typography.bodySmall, marginBottom: spacing.xl, textAlign: 'center' },
        emptyButton: {
          backgroundColor: colors.primary,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          borderRadius: radius.xl,
        },
        emptyButtonText: { fontSize: 17, fontWeight: '600', color: colors.onPrimary },
      }),
    [colors, typography, cardBorder, TOKEN, SHADOW]
  );

  const wordsLoaded = useWordsStore((s) => s.wordsLoadedFromSupabase);
  const wordsContentLocale = useWordsStore((s) => s.wordsContentLocale);
  const wordIds = useMemo(() => db.getSavedWordIds(), []);
  const words = useMemo(() => getWordsByIds(wordIds), [wordIds, wordsLoaded, wordsContentLocale, displayLanguage]);

  const [order, setOrder] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [initDone, setInitDone] = useState(false);
  const resultsByWordIdRef = useRef<Record<string, boolean>>({});

  const currentWord = order.length > 0 && words.length > 0 ? words[order[currentIndex]] : null;

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

  const handleQuitPress = () => {
    Alert.alert(
      t.quitConfirmTitle,
      undefined,
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.quit, style: 'destructive', onPress: () => router.replace('/(tabs)/saved') },
      ]
    );
  };

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
    const wrong = getWrongMeaningOptions(
      currentWord.topik_level,
      currentWord.lesson_id,
      currentWord.japanese,
      3,
      uiLocale
    );
    return [currentWord.japanese, ...wrong].sort(() => Math.random() - 0.5);
  }, [currentWord, uiLocale, wordsContentLocale]);

  useEffect(() => {
    if (words.length === 0) return;
    resultsByWordIdRef.current = {};
    const shuffled = words.map((_, i) => i).sort(() => Math.random() - 0.5);
    const take = Math.min(SAVED_QUIZ_COUNT, words.length);
    setOrder(shuffled.slice(0, take));
    setCurrentIndex(0);
    setCorrectCount(0);
    setInitDone(true);
  }, [words.length, wordsContentLocale]);

  useEffect(() => {
    if (wordIds.length === 0 || (words.length === 0 && wordsLoaded)) {
      router.replace('/(tabs)/saved');
    }
  }, [wordIds.length, words.length, wordsLoaded, router]);

  const handleSelect = (answer: string) => {
    if (waiting || !currentWord) return;
    void triggerSelectionHaptic();
    setSelected(answer);
    setWaiting(true);
    const isCorrect = answer === currentWord.japanese;
    resultsByWordIdRef.current = { ...resultsByWordIdRef.current, [currentWord.id]: isCorrect };
    if (isCorrect) void playCorrectSound();
    else void playIncorrectSound();
    setCorrectCount((c) => c + (isCorrect ? 1 : 0));

    const delay = isCorrect ? 800 : 1500;
    setTimeout(() => {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= order.length) {
        const totalCorrect = correctCount + (isCorrect ? 1 : 0);
        const quizWordIds = order.map((i) => words[i].id);
        const resultArray = quizWordIds.map((id) => (resultsByWordIdRef.current[id] === true ? 1 : 0));
        db.saveLessonQuizResult('saved', resultArray);
        db.setLastQuizWordIds('saved', quizWordIds);
        router.replace({
          pathname: '/quiz/result/[lessonId]',
          params: {
            lessonId: 'saved',
            type: 'word',
            total: String(order.length),
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

  if (wordIds.length === 0) {
    return (
      <View style={[styles.centered, styles.emptyCentered]}>
        <Text style={styles.emptyTitle}>{t.savedQuizEmptyTitle}</Text>
        <Text style={styles.emptySub}>{t.savedQuizEmptySub}</Text>
        <Pressable
          style={styles.emptyButton}
          onPress={() => { void triggerLightImpact(); router.replace('/(tabs)/saved'); }}
          accessibilityLabel={t.savedQuizBackButtonA11y}
          accessibilityRole="button"
        >
          <Text style={styles.emptyButtonText}>{t.savedQuizBackButton}</Text>
        </Pressable>
      </View>
    );
  }

  if (words.length === 0 || !initDone) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const progress = order.length > 0 ? (currentIndex + 1) / order.length : 0;

  return (
    <ErrorBoundary contextLabel={nav.quizSaved}>
    <View style={styles.container}>
      <View
        style={[styles.header, { paddingTop: headerPaddingTop }]}
        accessibilityRole="header"
        accessibilityLabel={t.quizHeaderA11y(nav.quizSaved, currentIndex + 1, order.length)}
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
          <Text style={styles.headerTitle}>{nav.quizSaved}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.headerCorrect}>{t.correctScore(correctCount)}</Text>
          </View>
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.headerCount}>{currentIndex + 1} / {order.length}</Text>
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
