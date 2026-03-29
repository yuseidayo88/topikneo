import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGrammarLessonIdsByLevel, getLessonSummary } from '@/src/data/grammar';
import { useGrammarStore } from '@/src/store/grammarStore';
import * as db from '@/src/db/database';
import { useSubscriptionStore, FREE_LESSONS_PER_LEVEL } from '@/src/store/subscriptionStore';
import { useProfileStore } from '@/src/store/profileStore';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { getLessonStrings } from '@/src/i18n/lessons';
import { getGrammarTabStrings } from '@/src/i18n/appScreens';
import { triggerLightImpact, triggerSelectionHaptic } from '@/src/utils/haptics';
import { spacing, radius, hexToRgba, GLASS_CARD_OPACITY } from '@/src/theme';
import { getSettingsFlowTokens, PAD as HEADER_PAD, CONTENT_W as HEADER_CONTENT_W } from '@/src/theme/settingsFlowTokens';

export default function GrammarLessonListScreen() {
  const { resolvedMode } = useTheme();
  const { colors, typography, cardShadow, cardBorder, flowShadow: SHADOW } = useThemeStyles();
  const { headerPaddingTop, footerPaddingBottom } = useSafeArea();
  const { level } = useLocalSearchParams<{ level: string }>();
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
  const gt = useMemo(
    () => getGrammarTabStrings(displayLanguage),
    [displayLanguage]
  );
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
        content: { padding: spacing.lg, paddingBottom: footerPaddingBottom + 48 },
        hint: { ...typography.caption, marginBottom: spacing.md },
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
        cardAccent: {
          width: 4,
          backgroundColor: colors.grammarPrimary ?? TOKEN.accent,
          borderTopLeftRadius: radius.xl,
          borderBottomLeftRadius: radius.xl,
        },
        cardAccentCleared: {
          backgroundColor: colors.grammarPrimary ?? TOKEN.accent,
        },
        cardInner: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.lg,
        },
        cardPressed: { opacity: 0.96, transform: [{ scale: 0.98 }] },
        cardMain: { flex: 1, minWidth: 0 },
        cardTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
        cardSummary: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
        clearedBadge: { marginLeft: spacing.sm },
        cardLocked: { opacity: 0.75 },
        lockBadge: { marginLeft: spacing.sm },
      }),
    [colors, typography, cardShadow, cardBorder, footerPaddingBottom, TOKEN, SHADOW]
  );
  const levelNum = level ? parseInt(level, 10) : 1;
  const grammarContentLocale = useGrammarStore((s) => s.grammarContentLocale);
  const lessonIds = useMemo(() => getGrammarLessonIdsByLevel(levelNum), [levelNum, grammarContentLocale]);
  const [clearedIds, setClearedIds] = useState<string[]>(() => db.getClearedLessonIds('grammar'));

  useFocusEffect(
    useCallback(() => {
      setClearedIds(db.getClearedLessonIds('grammar'));
    }, [])
  );

  const renderItem = useCallback(
    ({ item: id }: { item: string }) => {
      const numStr = id.replace(/^ko_G\d+_/, '');
      const lessonNumInt = parseInt(numStr, 10) || 1;
      const locked = !isSubscribed && lessonNumInt > FREE_LESSONS_PER_LEVEL;
      const cleared = clearedIds.includes(id);
      const summary = getLessonSummary(id);
      return (
        <View style={styles.cardWrap}>
          <Pressable
            style={({ pressed }) => [styles.card, locked && styles.cardLocked, pressed && styles.cardPressed]}
            onPress={() => {
            void triggerSelectionHaptic();
            if (locked) {
              router.push('/subscription');
              return;
            }
            router.push(`/(tabs)/grammar/${level}/${id}`);
          }}
          accessibilityLabel={
            locked
              ? `${lessonT.lessonWithLevel(level ?? '1', numStr)}、${lessonT.lessonLockedPro}`
              : `${lessonT.lessonWithLevel(level ?? '1', numStr)}${summary ? `、${summary}` : ''}${cleared ? ` · ${gt.clearedA11y}` : ''}`
          }
          accessibilityRole="button"
        >
          <View style={[styles.cardAccent, cleared && styles.cardAccentCleared]} />
          <View style={styles.cardInner}>
            <View style={styles.cardMain}>
              <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
                {lessonT.lessonWithLevel(level ?? '1', numStr)}
              </Text>
              {summary ? (
                <Text style={styles.cardSummary} numberOfLines={1} ellipsizeMode="tail">{summary}</Text>
              ) : null}
            </View>
            {locked ? (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={20} color={colors.textSecondary} />
              </View>
            ) : cleared ? (
              <View style={styles.clearedBadge}>
                <Ionicons name="checkmark-circle" size={24} color={colors.correct} />
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            )}
          </View>
          </Pressable>
        </View>
      );
    },
    [clearedIds, level, router, isSubscribed, lessonT, gt, styles]
  );

  const ListHeader = useCallback(
    () => <Text style={styles.hint}>{gt.lessonListHint}</Text>,
    [gt.lessonListHint, styles.hint]
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
            accessibilityLabel={gt.backA11y}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color={TOKEN.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {lessonT.grammarLessonsHeader(levelNum)}
          </Text>
          <View style={styles.headerRight} />
        </View>
      </View>
      <FlatList
        data={lessonIds}
        renderItem={renderItem}
        keyExtractor={(id) => id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.content}
        style={styles.listWrap}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </View>
  );
}
