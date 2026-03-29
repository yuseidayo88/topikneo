import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as db from '@/src/db/database';
import { getWordLessonIdsByLevel } from '@/src/data/words';
import { useWordsStore } from '@/src/store/wordsStore';
import { useSubscriptionStore, FREE_LESSONS_PER_LEVEL } from '@/src/store/subscriptionStore';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { useProfileStore } from '@/src/store/profileStore';
import { triggerLightImpact, triggerSelectionHaptic } from '@/src/utils/haptics';
import { getLessonStrings } from '@/src/i18n/lessons';
import { getVocabularyTabStrings } from '@/src/i18n/appScreens';
import { spacing, radius, hexToRgba, GLASS_CARD_OPACITY } from '@/src/theme';
import { getSettingsFlowTokens, PAD as HEADER_PAD, CONTENT_W as HEADER_CONTENT_W } from '@/src/theme/settingsFlowTokens';

const FALLBACK_LESSON_COUNT: Record<string, number> = { '1': 1, '2': 73, '3': 73, '4': 73, '5': 73, '6': 73 };
const WORDS_PER_LESSON = 10;

export default function LessonListScreen() {
  const { resolvedMode } = useTheme();
  const { colors, typography, cardShadow, cardBorder, flowShadow: SHADOW } = useThemeStyles();
  const { headerPaddingTop, footerPaddingBottom } = useSafeArea();
  const params = useLocalSearchParams<{ level?: string }>();
  const levelStr = params.level ?? '1';
  const router = useRouter();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false, title: '' });
  }, [navigation]);
  const isSubscribed = useSubscriptionStore((s) => s.isSubscribed);
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const lessonT = useMemo(
    () => getLessonStrings(displayLanguage),
    [displayLanguage]
  );
  const vt = useMemo(
    () => getVocabularyTabStrings(displayLanguage),
    [displayLanguage]
  );
  const wordsLoaded = useWordsStore((s) => s.wordsLoadedFromSupabase);
  const wordsContentLocale = useWordsStore((s) => s.wordsContentLocale);
  const wordsLoadError = useWordsStore((s) => s.wordsLoadError);
  const loadWords = useWordsStore((s) => s.loadWordsFromSupabase);
  const TOKEN = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        /* 設定ページと同じヘッダー形式（不透明で背後のテキストが透けない） */
        headerFixed: {
          paddingHorizontal: HEADER_PAD,
          alignItems: 'center',
          backgroundColor: TOKEN.surface,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 16,
          width: HEADER_CONTENT_W,
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
        listWrap: { flex: 1 },
        centered: { justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
        loadingText: { ...typography.body, marginTop: spacing.md, color: colors.textSecondary },
        errorWrap: { padding: spacing.xl },
        errorTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
        errorMessage: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
        retryButton: {
          backgroundColor: colors.primary,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          borderRadius: radius.xl,
        },
        retryButtonPressed: { opacity: 0.9 },
        retryButtonText: { fontSize: 17, fontWeight: '600', color: colors.onPrimary },
        content: { padding: spacing.lg, paddingBottom: footerPaddingBottom + 48 },
        sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
        summaryBox: {
          backgroundColor: hexToRgba(colors.card, GLASS_CARD_OPACITY),
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          ...cardBorder,
          ...cardShadow,
        },
        summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
        summaryText: { ...typography.body, fontWeight: '600', color: colors.text },
        progressTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
        progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
        hint: { ...typography.bodySmall, marginBottom: spacing.lg, color: colors.textSecondary },
        cardWrap: {
          borderRadius: radius.xl,
          marginBottom: spacing.md,
          backgroundColor: hexToRgba(colors.card, GLASS_CARD_OPACITY),
          ...cardBorder,
          ...cardShadow,
        },
        card: {
          flexDirection: 'row',
          alignItems: 'stretch',
          borderRadius: radius.xl,
          overflow: 'hidden',
        },
        cardCleared: {
          borderColor: hexToRgba(colors.correct, 0.25),
          backgroundColor: hexToRgba(colors.correct, 0.04),
        },
        cardPressed: { opacity: 0.96, transform: [{ scale: 0.98 }] },
        cardAccent: { width: 4, backgroundColor: colors.primary, borderTopLeftRadius: radius.xl, borderBottomLeftRadius: radius.xl },
        cardAccentCleared: { backgroundColor: colors.correct, borderTopLeftRadius: radius.xl, borderBottomLeftRadius: radius.xl },
        cardInner: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingLeft: spacing.lg + 2,
        },
        cardMain: { flex: 1, minWidth: 0 },
        cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
        wordsDots: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 3 },
        wordsDot: { width: 6, height: 6, borderRadius: 3 },
        wordsDotDefault: { backgroundColor: hexToRgba(colors.primary, 0.45) },
        wordsDotCorrect: { backgroundColor: colors.correct },
        wordsDotWrong: { backgroundColor: colors.wrong },
        wordsDotCleared: { backgroundColor: hexToRgba(colors.correct, 0.6) },
        clearedBadge: { alignItems: 'center', marginLeft: spacing.sm },
        clearedLabel: { fontSize: 11, fontWeight: '600', color: colors.correct, marginTop: 2 },
        cardLocked: { opacity: 0.75 },
        lockBadge: { marginLeft: spacing.sm },
      }),
    [colors, typography, cardShadow, cardBorder, footerPaddingBottom, TOKEN, SHADOW]
  );
  const levelNum = parseInt(levelStr, 10) || 1;
  const lessonIds = useMemo(() => getWordLessonIdsByLevel(levelNum), [levelNum, wordsLoaded, wordsContentLocale]);
  const lessons = lessonIds.length > 0
    ? lessonIds.map((id) => ({ id, num: parseInt(id.replace(/^ko_W\d+_/, ''), 10) || 1 }))
    : Array.from({ length: FALLBACK_LESSON_COUNT[levelStr] ?? 50 }, (_, i) => ({ id: `ko_W${levelStr}_${String(i + 1).padStart(2, '0')}`, num: i + 1 }));
  const [clearedIds, setClearedIds] = useState<string[]>(() => db.getClearedLessonIds('word'));
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  useEffect(() => {
    if (levelNum < 2 || wordsLoaded) return;
    const t = setTimeout(() => setLoadingTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [levelNum, wordsLoaded]);
  const showLoading = levelNum >= 2 && !wordsLoaded && !loadingTimedOut && lessonIds.length === 0;

  const clearedCount = useMemo(() => lessons.filter((l) => clearedIds.includes(l.id)).length, [lessons, clearedIds]);
  const progressPercent = lessons.length > 0 ? (clearedCount / lessons.length) * 100 : 0;

  useFocusEffect(
    useCallback(() => {
      setClearedIds(db.getClearedLessonIds('word'));
    }, [])
  );

  if (showLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{vt.loadingData}</Text>
      </View>
    );
  }

  if (wordsLoadError && levelNum >= 2 && lessonIds.length === 0) {
    return (
      <View style={[styles.container, styles.centered, styles.errorWrap]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.errorTitle}>{lessonT.wordListErrorTitle}</Text>
        <Text style={styles.errorMessage}>{wordsLoadError}</Text>
        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          onPress={() => loadWords()}
          accessibilityLabel={lessonT.retry}
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText}>{lessonT.retry}</Text>
        </Pressable>
      </View>
    );
  }

  const renderItem = ({ item }: { item: { id: string; num: number } }) => {
    const { id: lessonId, num } = item;
    const locked = !isSubscribed && num > FREE_LESSONS_PER_LEVEL;
    const cleared = clearedIds.includes(lessonId);
    const quizResult = db.getLessonQuizResult(lessonId);
    const hasResult = Array.isArray(quizResult) && quizResult.length === WORDS_PER_LESSON;
    return (
      <View style={[styles.cardWrap, cleared && styles.cardCleared]}>
        <Pressable
          style={({ pressed }) => [
            styles.card,
            locked && styles.cardLocked,
            pressed && styles.cardPressed,
          ]}
          onPress={() => {
          void triggerSelectionHaptic();
          if (locked) {
            router.push('/subscription');
            return;
          }
          router.push({ pathname: '/(tabs)/vocabulary/[level]/[lessonId]', params: { level: levelStr, lessonId } });
        }}
        accessibilityLabel={
          locked
            ? `${lessonT.lessonWithLevel(levelStr, num)}、${lessonT.lessonLockedPro}`
            : `${lessonT.lessonWithLevel(levelStr, num)}${cleared ? lessonT.clearedA11ySuffix : ''}`
        }
        accessibilityRole="button"
      >
        <View style={[styles.cardAccent, cleared && styles.cardAccentCleared]} />
        <View style={styles.cardInner}>
          <View style={styles.cardMain}>
            <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
              {lessonT.lessonWithLevel(levelStr, num)}
            </Text>
            <View style={styles.wordsDots} accessibilityLabel={lessonT.wordsCountA11y(WORDS_PER_LESSON)}>
              {Array.from({ length: WORDS_PER_LESSON }, (_, i) => {
                const correct = hasResult ? quizResult![i] === 1 : null;
                return (
                  <View
                    key={i}
                    style={[
                      styles.wordsDot,
                      correct === true && styles.wordsDotCorrect,
                      correct === false && styles.wordsDotWrong,
                      !hasResult && cleared && styles.wordsDotCleared,
                      !hasResult && !cleared && styles.wordsDotDefault,
                    ]}
                  />
                );
              })}
            </View>
          </View>
          {locked ? (
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={22} color={colors.textSecondary} />
            </View>
          ) : cleared ? (
            <View style={styles.clearedBadge}>
              <Ionicons name="checkmark-circle" size={26} color={colors.correct} />
              <Text style={styles.clearedLabel}>{lessonT.cleared}</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
          )}
        </View>
        </Pressable>
      </View>
    );
  };

  const ListHeader = () => (
    <>
      <Text style={styles.sectionLabel}>{lessonT.sectionProgress}</Text>
      <View style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <Ionicons name="book-outline" size={20} color={colors.primary} />
          <Text style={styles.summaryText}>{lessonT.lessonsCleared(clearedCount, lessons.length)}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, progressPercent)}%` }]} />
        </View>
      </View>
      <Text style={styles.hint}>{lessonT.wordListHint}</Text>
    </>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.headerFixed, { paddingTop: headerPaddingTop }]} collapsable={false}>
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.headerCircleBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              void triggerLightImpact();
              router.back();
            }}
            accessibilityLabel={lessonT.backA11y}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color={TOKEN.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{lessonT.vocabularyLessonsHeader(levelNum)}</Text>
          <View style={styles.headerRight} />
        </View>
      </View>
      <FlatList
        data={lessons}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.content}
        style={styles.listWrap}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
        accessibilityRole="list"
        accessibilityLabel={lessonT.lessonListA11y}
      />
    </View>
  );
}
