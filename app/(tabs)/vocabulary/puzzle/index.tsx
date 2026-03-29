import { useMemo, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useSubscriptionStore } from '@/src/store/subscriptionStore';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { triggerLightImpact, triggerSelectionHaptic } from '@/src/utils/haptics';
import { spacing, radius, hexToRgba, GLASS_CARD_OPACITY } from '@/src/theme';
import { getSettingsFlowTokens, PAD, CONTENT_W } from '@/src/theme/settingsFlowTokens';
import { useProfileStore } from '@/src/store/profileStore';
import { getHangulPuzzleStrings, type HangulPuzzleCourseId } from '@/src/i18n/flowScreens';

export type PuzzleCourse = HangulPuzzleCourseId;

const COURSE_IDS: HangulPuzzleCourseId[] = ['basic', 'batchim', 'batchim2', 'tensed', 'mixed'];

const PUZZLE_ACCENT = '#7C3AED';

const FREE_PUZZLE_COURSE_ID: PuzzleCourse = 'basic';

export default function HangulPuzzleCourseListScreen() {
  const { resolvedMode } = useTheme();
  const { colors, typography, cardShadow, cardBorder, flowShadow: SHADOW } = useThemeStyles();
  const isSubscribed = useSubscriptionStore((s) => s.isSubscribed);
  const TOKEN = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const router = useRouter();
  const navigation = useNavigation();
  const { headerPaddingTop, footerPaddingBottom } = useSafeArea();
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const hp = useMemo(
    () => getHangulPuzzleStrings(displayLanguage),
    [displayLanguage]
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false, title: '' });
  }, [navigation]);

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
        headerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', minWidth: 0 },
        headerTitle: {
          fontSize: 18,
          fontWeight: '700',
          color: TOKEN.ink,
          letterSpacing: -0.3,
        },
        headerRight: { width: 40 },
        scroll: { flex: 1 },
        scrollContent: {
          paddingHorizontal: PAD,
          paddingTop: spacing.xl,
          paddingBottom: footerPaddingBottom + 80,
          alignItems: 'center',
        },
        intro: {
          width: CONTENT_W,
          marginBottom: spacing.xl,
        },
        introText: { ...typography.body, color: TOKEN.inkMuted, textAlign: 'center' },
        sectionBlock: { width: CONTENT_W },
        courseCard: {
          flexDirection: 'row',
          alignItems: 'stretch',
          backgroundColor: TOKEN.surface,
          borderRadius: radius.xl,
          marginBottom: spacing.md,
          overflow: 'hidden',
          ...cardBorder,
          ...cardShadow,
        },
        courseCardPressed: { opacity: 0.92 },
        courseCardLocked: { opacity: 0.75 },
        courseAccent: { width: 5, backgroundColor: PUZZLE_ACCENT, borderTopLeftRadius: radius.xl, borderBottomLeftRadius: radius.xl },
        courseInner: { flex: 1, padding: spacing.lg },
        courseTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4 },
        courseDesc: { ...typography.bodySmall, color: colors.textSecondary },
        lockWrap: { position: 'absolute', right: spacing.lg, top: '50%', marginTop: -12 },
      }),
    [colors, typography, cardShadow, cardBorder, footerPaddingBottom, TOKEN, SHADOW]
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
            accessibilityLabel={hp.backA11y}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color={TOKEN.ink} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{hp.listTitle}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={styles.introText}>{hp.listIntro}</Text>
        </View>

        <View style={styles.sectionBlock}>
          {COURSE_IDS.map((courseId) => {
            const course = { id: courseId, ...hp.courses[courseId] };
            const locked = !isSubscribed && course.id !== FREE_PUZZLE_COURSE_ID;
            return (
              <Pressable
                key={course.id}
                style={({ pressed }) => [
                  styles.courseCard,
                  locked && styles.courseCardLocked,
                  pressed && styles.courseCardPressed,
                ]}
                onPress={() => {
                  void triggerSelectionHaptic();
                  if (locked) {
                    router.push('/subscription');
                    return;
                  }
                  router.push({ pathname: '/(tabs)/vocabulary/puzzle/play', params: { course: course.id } });
                }}
                accessibilityLabel={locked ? `${course.title}、${hp.proUnlockA11y}` : `${course.title}、${course.description}`}
                accessibilityRole="button"
              >
                <View style={styles.courseAccent} />
                <View style={styles.courseInner}>
                  <Text style={styles.courseTitle}>{course.title}</Text>
                  <Text style={styles.courseDesc}>{course.description}</Text>
                </View>
                {locked ? (
                  <View style={styles.lockWrap}>
                    <Ionicons name="lock-closed" size={24} color={colors.textSecondary} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
