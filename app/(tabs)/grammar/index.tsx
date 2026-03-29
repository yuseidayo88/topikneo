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
import { useGrammarStore } from '@/src/store/grammarStore';
import { useSubscriptionStore } from '@/src/store/subscriptionStore';
import { getGrammarLessonIdsByLevel, hasGrammarData } from '@/src/data/grammar';
import * as db from '@/src/db/database';
import { TabHeader } from '@/src/components/TabHeader';
import { NetworkErrorBlock } from '@/src/components/NetworkErrorBlock';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { triggerSelectionHaptic } from '@/src/utils/haptics';
import { typographyScale } from '@/src/theme';
import { getSettingsFlowTokens, type ShadowToken } from '@/src/theme/settingsFlowTokens';
import { useProfileStore } from '@/src/store/profileStore';
import { getGrammarTabStrings } from '@/src/i18n/appScreens';
import { useContentColumnWidth } from '@/src/hooks/useContentColumnWidth';

const RADIUS = { card: 24, pill: 999 };
const PAD = 24;
const GAP = 28;
const GAP_LEVEL_CARDS = 16;
const MIN_TOUCH = 44;

/** 全レベル入場可。レッスン1・2のみ無料は [level]/index で制限 */
const LEVELS = [
  { level: 1, free: true },
  { level: 2, free: true },
  { level: 3, free: true },
  { level: 4, free: true },
  { level: 5, free: true },
  { level: 6, free: true },
] as const;

export default function GrammarLevelListScreen() {
  const contentW = useContentColumnWidth(PAD);
  const router = useRouter();
  const { resolvedMode, colors } = useTheme();
  const { flowShadow: SHADOW } = useThemeStyles();
  const refresh = useProgressStore((s) => s.refresh);
  const { headerPaddingTop, tabBarPaddingBottom } = useSafeArea();
  const grammarLoaded = useGrammarStore((s) => s.grammarLoaded);
  const grammarLoading = useGrammarStore((s) => s.grammarLoading);
  const grammarLoadError = useGrammarStore((s) => s.grammarLoadError);
  /** 文法データのロケールが変わったときレッスン一覧の件数・要約を再計算する */
  useGrammarStore((s) => s.grammarContentLocale);
  const loadGrammar = useGrammarStore((s) => s.loadGrammarFromSupabase);
  const isSubscribed = useSubscriptionStore((s) => s.isSubscribed);
  const [refreshing, setRefreshing] = useState(false);
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const gt = useMemo(() => getGrammarTabStrings(displayLanguage), [displayLanguage]);

  const baseToken = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const TOKEN = useMemo(() => ({ ...baseToken, accent: baseToken.grammar, accentSoft: baseToken.grammarSoft }), [baseToken]);
  const styles = useMemo(() => createGrammarTabStyles(TOKEN, SHADOW, resolvedMode), [TOKEN, SHADOW, resolvedMode]);
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
      if (!grammarLoaded && !grammarLoading) {
        void loadGrammar();
      }
    }, [refresh, grammarLoaded, grammarLoading, loadGrammar])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGrammar();
    setRefreshing(false);
  }, [loadGrammar]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[TOKEN.bg, TOKEN.bgEnd]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <TabHeader
        title={gt.title}
        subtitle={gt.subtitle}
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
          {!grammarLoaded && grammarLoading ? (
            <View style={[styles.sectionBlock, { alignItems: 'center', paddingVertical: 20 }]}>
              <ActivityIndicator size="small" color={TOKEN.accent} />
              <Text style={[styles.supabaseHint, { marginTop: 8 }]}>{gt.loadingData}</Text>
            </View>
          ) : null}
          {grammarLoaded && !hasGrammarData() && !grammarLoadError && (
            <Text style={styles.supabaseHint}>{gt.supabaseHint}</Text>
          )}
          {grammarLoadError ? (
            <NetworkErrorBlock message={grammarLoadError} onRetry={onRefresh} loading={refreshing} />
          ) : null}

          <View style={styles.sectionBlock}>
            <View style={styles.sectionHead}>
              <View style={[styles.sectionAccent, { backgroundColor: TOKEN.accent }]} />
              <Text style={styles.sectionTitle}>{gt.sectionLessons}</Text>
            </View>
            <View style={styles.levelCardList}>
            {LEVELS.map(({ level, free }) => {
            const label = gt.levelLabels[level - 1] ?? `TOPIK ${level}`;
            const lessonIds = getGrammarLessonIdsByLevel(level);
            const count = lessonIds.length;
            const cleared = db.getLevelProgress(level, 'grammar');
            const hasLessons = count > 0;
            const canOpen = hasLessons && (free || isSubscribed);
            const pct = count > 0 ? Math.min(100, (cleared / count) * 100) : 0;
            return (
              <View key={level} style={styles.levelCardWrap}>
              <Pressable
                style={({ pressed }) => [styles.levelCard, pressed && styles.cardPressed, !hasLessons && styles.levelCardLocked]}
                onPress={() => {
                  void triggerSelectionHaptic();
                  if (!hasLessons) {
                    Alert.alert(gt.noLessonsTitle, gt.noLessonsMessage, [{ text: gt.noLessonsOk }]);
                    return;
                  }
                  if (canOpen) {
                    router.push(`/(tabs)/grammar/${level}`);
                  }
                  else if (!free && !isSubscribed) router.push('/subscription');
                }}
                accessibilityLabel={`${label} ${gt.lessonCountLabel(count)}、${canOpen ? `${cleared}/${count}` : ''}`}
                accessibilityRole="button"
              >
                {hasLessons && <View style={[styles.heroAccent, { backgroundColor: TOKEN.accent }]} />}
                {!hasLessons && <View style={styles.levelLockIcon}><Ionicons name="lock-closed" size={16} color={TOKEN.inkFaint} /></View>}
                <View style={styles.cardInner}>
                  <View style={styles.levelRow}>
                    <Text style={styles.levelTitle}>{label}</Text>
                  </View>
                  <Text style={styles.levelLabel}>{gt.lessonCountLabel(count)}</Text>
                  {hasLessons && (
                    <>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: TOKEN.accent }]} />
                      </View>
                      <Text style={styles.progressText}>{cleared} / {count}</Text>
                    </>
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

function createGrammarTabStyles(TOKEN: ReturnType<typeof getSettingsFlowTokens>, SHADOW: ShadowToken, _resolvedMode: 'light' | 'dark') {
  return StyleSheet.create({
    container: { flex: 1 },
    sectionBlock: {},
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: PAD, alignItems: 'center' },
    wrap: { gap: GAP },
    supabaseHint: { ...typographyScale.caption, color: TOKEN.inkMuted, marginBottom: GAP, textAlign: 'center' },
    sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    levelCardList: { gap: GAP_LEVEL_CARDS },
    sectionAccent: { width: 3, height: 20, borderRadius: 4, marginRight: 10 },
    sectionTitle: { ...typographyScale.section, color: TOKEN.ink, flex: 1 },
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
    cardPressed: { opacity: 0.92 },
    levelCardLocked: { opacity: 0.9 },
    heroAccent: { width: 5 },
    levelLockIcon: { width: 5, backgroundColor: TOKEN.inkFaint, paddingTop: PAD, paddingBottom: PAD },
    cardInner: { flex: 1, padding: PAD },
    levelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    levelTitle: { ...typographyScale.section, color: TOKEN.ink, flex: 1 },
    levelLabel: { ...typographyScale.bodySmall, color: TOKEN.inkMuted, marginBottom: 12 },
    progressTrack: { height: 6, borderRadius: RADIUS.pill, backgroundColor: TOKEN.divider, overflow: 'hidden', marginBottom: 6 },
    progressFill: { height: '100%', borderRadius: RADIUS.pill },
    progressText: { ...typographyScale.caption, color: TOKEN.inkFaint },
  });
}
