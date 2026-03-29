import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { getGrammarLessonIdsByLevel } from '@/src/data/grammar';
import { getWordLessonIdsByLevel, getWordsByLessonId, getWordsByIds, type WordItem } from '@/src/data/words';
import * as db from '@/src/db/database';
import { useWordsStore } from '@/src/store/wordsStore';
import { useProfileStore } from '@/src/store/profileStore';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { triggerLightImpact, triggerSelectionHaptic } from '@/src/utils/haptics';
import { getResultStrings, getQuizStrings } from '@/src/i18n/quiz';
import { spacing, radius, hexToRgba, GLASS_CARD_OPACITY, SAVED_STAR_YELLOW } from '@/src/theme';
import { getSettingsFlowTokens, PAD, CONTENT_W } from '@/src/theme/settingsFlowTokens';
import { getConfiguredSpeechVolume } from '@/src/utils/quizSoundEffects';
import { speakWordWithGeneratedFallback } from '@/src/utils/generatedWordSpeech';

function paramStr(p: string | string[] | undefined): string | undefined {
  if (p == null) return undefined;
  return Array.isArray(p) ? p[0] : p;
}

export default function ResultScreen() {
  const { colors, typography, cardShadow, cardBorder, flowShadow: SHADOW } = useThemeStyles();
  const { resolvedMode } = useTheme();
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const t = useMemo(() => getResultStrings(displayLanguage), [displayLanguage]);
  const TOKEN = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const { headerPaddingTop, footerPaddingBottom } = useSafeArea();
  const params = useLocalSearchParams<{
    lessonId?: string;
    type?: string;
    total?: string;
    correct?: string;
  }>();
  const lessonId = paramStr(params.lessonId);
  const type = paramStr(params.type);
  const total = paramStr(params.total);
  const correct = paramStr(params.correct);
  const router = useRouter();

  const totalNum = Math.max(0, parseInt(total ?? '', 10) || 0);
  const correctNum = Math.max(0, parseInt(correct ?? '', 10) || 0);
  const isClear = totalNum > 0 && correctNum === totalNum;
  const percent = totalNum > 0 ? Math.round((correctNum / totalNum) * 100) : 0;

  const wordsLoaded = useWordsStore((s) => s.wordsLoadedFromSupabase);
  const wordsContentLocale = useWordsStore((s) => s.wordsContentLocale);
  const [savedWordIds, setSavedWordIds] = useState<string[]>(() => db.getSavedWordIds());
  const qt = useMemo(() => getQuizStrings(displayLanguage), [displayLanguage]);
  const wordIdsForQuiz = useMemo(
    () => (lessonId === 'saved' || lessonId === 'review' ? db.getLastQuizWordIds(lessonId) : []),
    [lessonId]
  );
  const wordsByLesson = useMemo(() => getWordsByLessonId(lessonId ?? ''), [lessonId, wordsLoaded, wordsContentLocale, displayLanguage]);
  const wordsFromQuizOrder = useMemo(() => {
    if (wordIdsForQuiz.length === 0) return [];
    const list = getWordsByIds(wordIdsForQuiz);
    return wordIdsForQuiz.map((id) => list.find((w) => w.id === id)).filter(Boolean) as WordItem[];
  }, [wordIdsForQuiz, wordsLoaded, wordsContentLocale, displayLanguage]);
  const words = useMemo(() => {
    if (lessonId === 'saved' || lessonId === 'review') return wordsFromQuizOrder;
    return wordsByLesson;
  }, [lessonId, wordsByLesson, wordsFromQuizOrder]);
  const quizResult = useMemo(() => db.getLessonQuizResult(lessonId ?? ''), [lessonId]);
  const wrongWords = useMemo(() => {
    if (type !== 'word' || !lessonId || !quizResult || words.length !== quizResult.length) return [];
    return words.filter((_, i) => quizResult[i] === 0);
  }, [type, lessonId, words, quizResult]);

  const wordNextLessonId = useMemo(() => {
    if (type !== 'word' || !lessonId || lessonId === 'saved' || lessonId === 'review') return null;
    const level = parseInt(lessonId.match(/^ko_W(\d+)_/)?.[1] ?? '1', 10);
    const ids = getWordLessonIdsByLevel(level);
    const idx = ids.indexOf(lessonId);
    return idx >= 0 && idx + 1 < ids.length ? ids[idx + 1]! : null;
  }, [type, lessonId]);

  const grammarNextLessonId = useMemo(() => {
    if (type !== 'grammar' || !lessonId || lessonId === 'saved') return null;
    const level = parseInt(lessonId.match(/^ko_G(\d+)_/)?.[1] ?? '1', 10);
    const ids = getGrammarLessonIdsByLevel(level);
    const idx = ids.indexOf(lessonId);
    return idx >= 0 && idx + 1 < ids.length ? ids[idx + 1]! : null;
  }, [type, lessonId]);

  /** 文法クイズ完了後に同じ級の単語レッスン一覧へ */
  const grammarLevelForVocabulary = useMemo(() => {
    if (type !== 'grammar' || !lessonId || lessonId === 'saved') return null;
    return lessonId.match(/^ko_G(\d+)_/)?.[1] ?? null;
  }, [type, lessonId]);

  const hasNextLesson = !!(wordNextLessonId || grammarNextLessonId);

  const isWordLessonList = type === 'word' && lessonId && lessonId !== 'saved' && lessonId !== 'review';
  const lessonListLabel =
    lessonId === 'saved'
      ? t.backToSavedList
      : type === 'grammar'
        ? t.backToGrammarList
        : isWordLessonList
          ? t.backToWordList
          : t.backToList;

  const goToLessonList = () => {
    void triggerLightImpact();
    if (type === 'grammar') {
      router.replace('/(tabs)/grammar');
      return;
    }
    if (lessonId === 'saved') {
      router.replace('/(tabs)/saved');
      return;
    }
    if (lessonId === 'review') {
      router.replace('/(tabs)/vocabulary');
      return;
    }
    // 単語レッスン時は「そのレベルのレッスン一覧」へ（TEST_CHECKLIST の遷移の要所に合わせる）
    const level = lessonId?.match(/^ko_W(\d+)_/)?.[1] ?? '1';
    router.replace({ pathname: '/(tabs)/vocabulary/[level]', params: { level } });
  };

  const retryQuiz = () => {
    void triggerLightImpact();
    if (type === 'grammar' && lessonId && lessonId !== 'saved') {
      router.replace(`/(tabs)/grammar/quiz/${lessonId}`);
      return;
    }
    if (type === 'word' && lessonId === 'saved') {
      router.replace('/quiz/saved');
      return;
    }
    if (type === 'word' && lessonId === 'review') {
      router.replace('/quiz/review');
      return;
    }
    if (type === 'word' && lessonId) {
      router.replace(`/quiz/word/${lessonId}`);
      return;
    }
    router.replace('/(tabs)');
  };

  const goToNextLesson = () => {
    void triggerLightImpact();
    if (type === 'grammar' && lessonId && grammarNextLessonId) {
      const level = parseInt(lessonId.match(/^ko_G(\d+)_/)?.[1] ?? '1', 10);
      router.replace(`/(tabs)/grammar/${level}/${grammarNextLessonId}`);
      return;
    }
    if (type === 'word' && lessonId && wordNextLessonId) {
      const level = lessonId.match(/^ko_W(\d+)_/)?.[1] ?? '1';
      router.replace({ pathname: '/(tabs)/vocabulary/[level]/[lessonId]', params: { level, lessonId: wordNextLessonId } });
      return;
    }
  };

  const goToVocabularySameLevel = () => {
    void triggerLightImpact();
    if (!grammarLevelForVocabulary) return;
    router.replace({ pathname: '/(tabs)/vocabulary/[level]', params: { level: grammarLevelForVocabulary } });
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        headerFixed: {
          paddingHorizontal: PAD,
          alignItems: 'center',
          backgroundColor: TOKEN.surface,
          borderBottomWidth: 1,
          borderBottomColor: TOKEN.border,
          paddingBottom: 16,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: CONTENT_W,
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
        headerRight: { width: 40 },
        scrollContent: {
          flexGrow: 1,
          alignItems: 'center',
          paddingHorizontal: PAD,
          paddingTop: spacing.xxl,
          paddingBottom: footerPaddingBottom + spacing.xl,
        },
        card: {
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
        label: { ...typography.body, color: colors.textSecondary },
        percentWrap: {
          marginTop: spacing.xl,
          alignItems: 'center',
        },
        percentLabel: { ...typography.caption, color: TOKEN.inkMuted, marginBottom: 12 },
        circleWrap: {
          width: 120,
          height: 120,
          alignItems: 'center',
          justifyContent: 'center',
        },
        circleSvg: { position: 'absolute' },
        percentValue: {
          fontSize: 28,
          fontWeight: '800',
          color: colors.text,
        },
        percentUnit: { fontSize: 14, fontWeight: '700', color: TOKEN.inkMuted },
        countCaption: { ...typography.caption, color: TOKEN.inkMuted, marginTop: 10 },
        actions: { width: '100%', maxWidth: CONTENT_W, gap: spacing.sm },
        primaryButton: {
          borderRadius: radius.xl,
          overflow: 'hidden',
          height: 52,
          width: '100%',
        },
        primaryButtonGradient: {
          height: 52,
          justifyContent: 'center',
          alignItems: 'center',
        },
        primaryButtonText: { fontSize: 17, fontWeight: '600', color: colors.onPrimary },
        rowButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: 52,
          width: '100%',
          backgroundColor: TOKEN.surface,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: TOKEN.border,
        },
        rowButtonPressed: { opacity: 0.9 },
        rowButtonText: { ...typography.body, color: TOKEN.ink, fontWeight: '600' },
        rowButtonIcon: { marginRight: 8 },
        wrongSection: { width: '100%', maxWidth: CONTENT_W, marginTop: spacing.xxl },
        wrongSectionTitle: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.sm,
          gap: 6,
        },
        wrongSectionTitleText: { fontSize: 16, fontWeight: '700', color: TOKEN.ink },
        wrongCard: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: hexToRgba(colors.card, GLASS_CARD_OPACITY),
          borderRadius: radius.lg,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.sm,
          ...cardBorder,
        },
        wrongKorean: { fontSize: 18, fontWeight: '700', color: colors.text },
        wrongReading: { fontSize: 13, color: TOKEN.inkMuted, marginTop: 2 },
        wrongJapanese: { fontSize: 15, color: colors.textSecondary, flex: 1 },
        wrongActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        wrongIconBtn: { padding: 8 },
      }),
    [colors, typography, cardShadow, cardBorder, footerPaddingBottom, TOKEN, SHADOW]
  );

  return (
    <ErrorBoundary contextLabel={t.errorBoundaryContext}>
    <View style={styles.container}>
      <View style={[styles.headerFixed, { paddingTop: headerPaddingTop }]}>
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.headerCircleBtn, pressed && { opacity: 0.8 }]}
            onPress={goToLessonList}
            accessibilityLabel={lessonListLabel}
            accessibilityRole="button"
          >
            <Ionicons name="close" size={22} color={TOKEN.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{t.resultTitle}</Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View
          style={styles.card}
          accessibilityRole="summary"
          accessibilityLabel={
            totalNum > 0
              ? `${isClear ? t.clear : t.tryAgainLabel} ${t.percentLabel} ${percent}%、${t.correctCountCaption(correctNum, totalNum)}`
              : isClear ? t.clear : t.tryAgainLabel
          }
        >
          <Text style={styles.label}>{isClear ? t.clear : t.tryAgainLabel}</Text>

          {totalNum > 0 && (
            <View style={styles.percentWrap}>
              <Text style={styles.percentLabel}>{t.percentLabel}</Text>
              <View style={styles.circleWrap}>
                <Svg width={120} height={120} style={styles.circleSvg}>
                  <Circle
                    cx={60}
                    cy={60}
                    r={52}
                    stroke={TOKEN.border}
                    strokeWidth={10}
                    fill="transparent"
                  />
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
              <Text style={styles.countCaption}>{t.correctCountCaption(correctNum, totalNum)}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {!isClear && (
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}
              onPress={retryQuiz}
              accessibilityLabel={t.retryAccessibility}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>{t.retry}</Text>
              </LinearGradient>
            </Pressable>
          )}

          {hasNextLesson && (
            <Pressable
              style={({ pressed }) => [styles.rowButton, pressed && styles.rowButtonPressed]}
              onPress={goToNextLesson}
              accessibilityLabel={t.nextLesson}
              accessibilityRole="button"
            >
              <Ionicons name="arrow-forward-circle-outline" size={22} color={TOKEN.ink} style={styles.rowButtonIcon} />
              <Text style={styles.rowButtonText}>{t.nextLesson}</Text>
            </Pressable>
          )}

          {type === 'grammar' && grammarLevelForVocabulary && (
            <Pressable
              style={({ pressed }) => [styles.rowButton, pressed && styles.rowButtonPressed]}
              onPress={goToVocabularySameLevel}
              accessibilityLabel={t.goToVocabularySameLevel}
              accessibilityRole="button"
            >
              <Ionicons name="book-outline" size={22} color={TOKEN.accent} style={styles.rowButtonIcon} />
              <Text style={styles.rowButtonText}>{t.goToVocabularySameLevel}</Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [styles.rowButton, pressed && styles.rowButtonPressed]}
            onPress={goToLessonList}
            accessibilityLabel={lessonListLabel}
            accessibilityRole="button"
          >
            <Ionicons name="list-outline" size={22} color={TOKEN.ink} style={styles.rowButtonIcon} />
            <Text style={styles.rowButtonText}>{lessonListLabel}</Text>
          </Pressable>
        </View>

        {type === 'word' && wrongWords.length > 0 && (
          <View
            style={styles.wrongSection}
            accessibilityRole="list"
            accessibilityLabel={t.wrongWordsSection(wrongWords.length)}
          >
            <View style={styles.wrongSectionTitle}>
              <Ionicons name="close-circle-outline" size={20} color={colors.wrong} />
              <Text style={styles.wrongSectionTitleText}>{t.wrongWordsSection(wrongWords.length)}</Text>
            </View>
            {wrongWords.map((w: WordItem) => {
              const isSaved = savedWordIds.includes(w.id);
              return (
                <View key={w.id} style={styles.wrongCard} accessibilityLabel={`${w.korean} ${w.reading} ${w.japanese}`}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.wrongKorean}>{w.korean}</Text>
                    <Text style={styles.wrongReading}>{w.reading}</Text>
                  </View>
                  <Text style={styles.wrongJapanese} numberOfLines={2}>{w.japanese}</Text>
                  <View style={styles.wrongActions}>
                    <Pressable
                      style={({ pressed }) => [styles.wrongIconBtn, pressed && { opacity: 0.7 }]}
                      onPress={() => {
                        void speakWordWithGeneratedFallback('word', w.korean, {
                          language: 'ko-KR',
                          rate: 0.9,
                          volume: getConfiguredSpeechVolume(),
                        });
                      }}
                      accessibilityLabel={qt.playPronunciation}
                      accessibilityRole="button"
                    >
                      <Ionicons name="volume-high-outline" size={22} color={TOKEN.accent} />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.wrongIconBtn, pressed && { opacity: 0.7 }]}
                      onPress={() => {
                        void triggerSelectionHaptic();
                        db.toggleSavedWord(w.id);
                        setSavedWordIds(db.getSavedWordIds());
                      }}
                      accessibilityLabel={isSaved ? qt.removeFromFavorites : qt.addToFavorites}
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name={isSaved ? 'star' : 'star-outline'}
                        size={24}
                        color={isSaved ? SAVED_STAR_YELLOW : TOKEN.inkMuted}
                      />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
    </ErrorBoundary>
  );
}
