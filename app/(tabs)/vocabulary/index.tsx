import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useProgressStore } from '@/src/store/progressStore';
import { useWordsStore } from '@/src/store/wordsStore';
import { useSubscriptionStore } from '@/src/store/subscriptionStore';
import { REVIEW_WORDS_PER_SESSION } from '../../quiz/review';
import { TabHeader } from '@/src/components/TabHeader';
import { NetworkErrorBlock } from '@/src/components/NetworkErrorBlock';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { triggerSelectionHaptic } from '@/src/utils/haptics';
import { playStartSound } from '@/src/utils/quizSoundEffects';
import { typographyScale } from '@/src/theme';
import { getSettingsFlowTokens, type ShadowToken } from '@/src/theme/settingsFlowTokens';
import { useProfileStore } from '@/src/store/profileStore';
import { getVocabularyTabStrings } from '@/src/i18n/appScreens';
import { getCommonStrings } from '@/src/i18n/common';
import { useContentColumnWidth } from '@/src/hooks/useContentColumnWidth';

const RADIUS = { card: 24, pill: 999 };
const PAD = 24;
const GAP = 28;
const GAP_LEVEL_CARDS = 16;
const MIN_TOUCH = 44;

const LEVELS = [
  { level: 1, free: true },
  { level: 2, free: true },
  { level: 3, free: true },
  { level: 4, free: true },
  { level: 5, free: true },
  { level: 6, free: true },
] as const;

export default function VocabularyLevelListScreen() {
  const contentW = useContentColumnWidth(PAD);
  const router = useRouter();
  const { resolvedMode, colors } = useTheme();
  const { flowShadow: SHADOW } = useThemeStyles();
  const refresh = useProgressStore((s) => s.refresh);
  const { headerPaddingTop, tabBarPaddingBottom } = useSafeArea();
  const levelProgress = useProgressStore((s) => s.levelProgress);
  const reviewCount = useProgressStore((s) => s.reviewCount);
  const isSubscribed = useSubscriptionStore((s) => s.isSubscribed);
  const wordsLoaded = useWordsStore((s) => s.wordsLoadedFromSupabase);
  const wordsLoading = useWordsStore((s) => s.wordsLoading);
  const wordsLoadError = useWordsStore((s) => s.wordsLoadError);
  const loadWords = useWordsStore((s) => s.loadWordsFromSupabase);
  const lessonCountByLevel = useWordsStore((s) => s.lessonCountByLevel) ?? {};
  /** 単語データのロケール切替後にレッスン数表示を更新 */
  useWordsStore((s) => s.wordsContentLocale);
  const [refreshing, setRefreshing] = useState(false);
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const vt = useMemo(() => getVocabularyTabStrings(displayLanguage), [displayLanguage]);
  const commonStr = useMemo(() => getCommonStrings(displayLanguage), [displayLanguage]);

  const baseToken = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const TOKEN = useMemo(() => ({
    ...baseToken,
    puzzle: '#7C3AED',
    puzzleSoft: 'rgba(124,58,237,0.14)',
  }), [baseToken]);
  const styles = useMemo(() => createVocabularyTabStyles(TOKEN, SHADOW, resolvedMode), [TOKEN, SHADOW, resolvedMode]);
  const headerTheme = useMemo(
    () => ({
      headerBg: TOKEN.bg,
      headerBorderColor: TOKEN.border,
      avatarBg: TOKEN.accentSoft,
      avatarBorderColor: 'rgba(30,64,175,0.35)',
      avatarIconColor: TOKEN.accent,
      titleColor: TOKEN.ink,
      subtitleColor: TOKEN.inkMuted,
      settingsCircleBg: TOKEN.surface,
      settingsCircleBorder: TOKEN.border,
      settingsIconColor: TOKEN.inkMuted,
    }),
    [TOKEN, resolvedMode]
  );

  const scrollRef = useRef<ScrollView | null>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      refresh();
      if (!wordsLoaded && !wordsLoading) {
        void loadWords();
      }
    }, [refresh, wordsLoaded, wordsLoading, loadWords])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWords();
    setRefreshing(false);
  }, [loadWords]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[TOKEN.bg, TOKEN.bgEnd]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <TabHeader
        title={vt.title}
        subtitle={vt.subtitle}
        paddingTop={headerPaddingTop}
        contentWidth={contentW}
        theme={headerTheme}
        shadow={SHADOW}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPaddingBottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.wrap, { width: contentW }]}>
          {!wordsLoaded && wordsLoading ? (
            <View style={[styles.sectionBlock, { alignItems: 'center', paddingVertical: 20 }]}>
              <ActivityIndicator size="small" color={TOKEN.accent} />
              <Text style={[styles.cardHint, { marginTop: 8 }]}>{vt.loadingData}</Text>
            </View>
          ) : null}
          {wordsLoadError ? (
            <NetworkErrorBlock onRetry={onRefresh} loading={refreshing} />
          ) : null}

          {/* ハングルパズル（一番上・単語クイズと別色で差別化） */}
          <View style={styles.sectionBlock}>
            <View style={styles.cardWrap}>
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => {
                  void triggerSelectionHaptic();
                  router.push('/(tabs)/vocabulary/puzzle');
                }}
                accessibilityLabel={vt.hangulPuzzle}
                accessibilityRole="button"
              >
                <View style={[styles.heroAccent, styles.heroAccentPuzzle]} />
                <View style={styles.cardInner}>
                <View style={[styles.tileIcon, styles.tileIconPuzzle]}>
                  <Ionicons name="grid-outline" size={26} color={TOKEN.puzzle} />
                </View>
                <Text style={styles.cardLabel}>{vt.hangulPuzzle}</Text>
                <Text style={styles.cardHint}>{vt.hangulPuzzleHint}</Text>
              </View>
              </Pressable>
            </View>
          </View>

          {/* 復習カード（ハングルパズルの下） */}
          <View style={styles.sectionBlock}>
            <View style={styles.cardWrap}>
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={
                  reviewCount > 0
                    ? () => {
                        void triggerSelectionHaptic();
                        void playStartSound();
                        router.push('/quiz/review');
                      }
                    : () => {
                        void triggerSelectionHaptic();
                        Alert.alert(vt.reviewAlertTitle, vt.reviewAlertMessage, [{ text: commonStr.alertOk }]);
                      }
                }
                accessibilityLabel={
                  reviewCount > 0
                    ? vt.reviewCardA11yActive(reviewCount)
                    : `${vt.reviewAlertTitle}。${vt.reviewCardEmptyHint}`
                }
                accessibilityRole="button"
              >
              <View style={styles.heroAccent} />
              <View style={styles.cardInner}>
                <View style={[styles.tileIcon, { backgroundColor: TOKEN.accentSoft }]}>
                  <Ionicons name="refresh" size={26} color={TOKEN.accent} />
                </View>
                <Text style={styles.cardLabel}>{vt.review}</Text>
                <Text style={[styles.cardValue, reviewCount === 0 && styles.cardMuted]}>
                  {reviewCount > 0 ? vt.reviewCountBadge(reviewCount) : vt.reviewNone}
                </Text>
                {reviewCount > 0 ? (
                  <Text style={styles.cardHint}>{vt.reviewHintActive(REVIEW_WORDS_PER_SESSION)}</Text>
                ) : (
                  <Text style={styles.cardHint}>{vt.reviewHintEmpty}</Text>
                )}
              </View>
              </Pressable>
            </View>
          </View>

          {/* 単語レッスン一覧 */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>{vt.sectionLessons}</Text>
            </View>
            <View style={styles.levelCardList}>
            {LEVELS.map(({ level, free }) => {
            const label = vt.levelLabels[level - 1] ?? `Level ${level}`;
            const lessons = wordsLoaded && lessonCountByLevel[level] != null ? lessonCountByLevel[level]! : 0;
            const canOpen = free || isSubscribed;
            const progress = levelProgress[level] ?? 0;
            const pct = lessons > 0 ? Math.min(100, (progress / lessons) * 100) : 0;
            const progressA11y = wordsLoaded ? `${progress}/${lessons}` : vt.loadingProgress;
            return (
              <View key={level} style={styles.levelCardWrap}>
              <Pressable
                style={({ pressed }) => [styles.levelCard, pressed && styles.cardPressed, !canOpen && styles.levelCardLocked]}
                onPress={() => {
                  void triggerSelectionHaptic();
                  if (canOpen) {
                    router.push({ pathname: '/(tabs)/vocabulary/[level]', params: { level: String(level) } });
                  } else {
                    router.push('/subscription');
                  }
                }}
                accessibilityLabel={`${vt.topikLevelTitle(level)} ${label}、${canOpen ? progressA11y : vt.paywalledA11y}`}
                accessibilityRole="button"
              >
                {canOpen && <View style={styles.heroAccent} />}
                {!canOpen && <View style={styles.levelLockIcon}><Ionicons name="lock-closed" size={16} color={TOKEN.inkFaint} /></View>}
                <View style={styles.cardInner}>
                  <View style={styles.levelRow}>
                    <Text style={styles.levelTitle}>{vt.topikLevelTitle(level)}</Text>
                  </View>
                  <Text style={styles.levelLabel} numberOfLines={2}>{label}</Text>
                  {canOpen ? (
                    <>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.progressText}>{wordsLoaded ? `${progress} / ${lessons}` : vt.loadingProgress}</Text>
                    </>
                  ) : (
                    <Text style={styles.cardMuted}>{wordsLoaded ? vt.levelLessonCount(lessons) : vt.loadingProgress}</Text>
                  )}
                </View>
              </Pressable>
              </View>
            );
          })}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

type VocabToken = ReturnType<typeof getSettingsFlowTokens> & { puzzle: string; puzzleSoft: string };

function createVocabularyTabStyles(TOKEN: VocabToken, SHADOW: ShadowToken, _resolvedMode: 'light' | 'dark') {
  return StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: PAD, alignItems: 'center' },
    wrap: { gap: GAP },
    sectionBlock: {},
    sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    levelCardList: { gap: GAP_LEVEL_CARDS },
    sectionAccent: { width: 3, height: 20, borderRadius: 4, backgroundColor: TOKEN.accent, marginRight: 10 },
    sectionTitle: { ...typographyScale.section, color: TOKEN.ink, flex: 1 },
    cardWrap: {
      borderRadius: RADIUS.card,
      borderWidth: 1,
      borderColor: TOKEN.border,
      backgroundColor: TOKEN.surface,
      ...SHADOW,
    },
    card: {
      flexDirection: 'row',
      borderRadius: RADIUS.card,
      overflow: 'hidden',
    },
    cardPressed: { opacity: 0.92 },
    heroAccent: { width: 5, backgroundColor: TOKEN.accent },
    heroAccentPuzzle: { backgroundColor: TOKEN.puzzle },
    cardInner: { flex: 1, padding: PAD },
    tileIcon: {
      width: 54,
      height: 54,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    tileIconPuzzle: { backgroundColor: TOKEN.puzzleSoft },
    cardLabel: { ...typographyScale.bodyMedium, fontWeight: '700', color: TOKEN.ink, marginBottom: 4 },
    cardValue: { ...typographyScale.body, fontWeight: '600', color: TOKEN.accent },
    cardMuted: { ...typographyScale.bodySmall, color: TOKEN.inkFaint },
    cardHint: { ...typographyScale.caption, color: TOKEN.inkFaint, marginTop: 4 },
    levelCardWrap: {
      borderRadius: RADIUS.card,
      borderWidth: 1,
      borderColor: TOKEN.border,
      backgroundColor: TOKEN.surface,
      ...SHADOW,
    },
    levelCard: {
      flexDirection: 'row',
      borderRadius: RADIUS.card,
      overflow: 'hidden',
    },
    levelCardLocked: { opacity: 0.9 },
    levelLockIcon: {
      width: 5,
      backgroundColor: TOKEN.inkFaint,
      alignItems: 'center' as const,
      justifyContent: 'center',
      paddingTop: PAD,
      paddingBottom: PAD,
    },
    levelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    levelTitle: { ...typographyScale.section, color: TOKEN.ink, flex: 1 },
    levelLabel: { ...typographyScale.bodySmall, color: TOKEN.inkMuted, marginBottom: 12 },
    progressTrack: { height: 6, borderRadius: RADIUS.pill, backgroundColor: TOKEN.divider, overflow: 'hidden', marginBottom: 6 },
    progressFill: { height: '100%', borderRadius: RADIUS.pill, backgroundColor: TOKEN.accent },
    progressText: { ...typographyScale.caption, color: TOKEN.inkFaint },
  });
}
