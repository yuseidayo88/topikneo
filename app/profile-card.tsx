import { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { triggerLightImpact } from '@/src/utils/haptics';
import { useProfileStore } from '@/src/store/profileStore';
import { getHomeTabStrings, getProfileCardStrings } from '@/src/i18n/appScreens';
import { useProgressStore } from '@/src/store/progressStore';
import { useWordsStore } from '@/src/store/wordsStore';
import { useGrammarStore } from '@/src/store/grammarStore';
import { hexToRgba, typographyScale } from '@/src/theme';
import { getSettingsFlowTokens, CONTENT_W, PAD as FLOW_PAD } from '@/src/theme/settingsFlowTokens';
import * as db from '@/src/db/database';

const LEVELS = [1, 2, 3, 4, 5, 6] as const;
const CARD_MAX_W = 380;
const PAD = 16;
const RADIUS = 20;
function buildCalendarCells(
  year: number,
  month: number,
  monthStats: Record<string, number>
): { type: 'empty' | 'day'; day?: number; date?: string; lessonsCleared?: number }[] {
  const firstDay = new Date(year, month - 1, 1);
  const firstWeekday = firstDay.getDay();
  const lastDay = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, '0');
  const cells: { type: 'empty' | 'day'; day?: number; date?: string; lessonsCleared?: number }[] = [];
  for (let i = 0; i < 42; i++) {
    if (i < firstWeekday || i >= firstWeekday + lastDay) {
      cells.push({ type: 'empty' });
    } else {
      const day = i - firstWeekday + 1;
      const dateStr = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
      cells.push({ type: 'day', day, date: dateStr, lessonsCleared: monthStats[dateStr] ?? 0 });
    }
  }
  return cells;
}

export default function ProfileCardScreen() {
  const router = useRouter();
  const { headerPaddingTop, footerPaddingBottom } = useSafeArea();
  const { colors, resolvedMode } = useTheme();
  const { flowShadow: SHADOW } = useThemeStyles();
  const FLOW_TOKEN = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  /** モーダル: タイトル・閉じる周辺の窮屈さを避けるため余白を少し戻す */
  const headerTop = useMemo(() => Math.max(10, headerPaddingTop - 48), [headerPaddingTop]);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        headerFixed: { paddingHorizontal: FLOW_PAD, alignItems: 'center', backgroundColor: 'transparent' },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 10,
        },
        headerCircleBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: FLOW_TOKEN.surface,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: FLOW_TOKEN.border,
          ...SHADOW,
        },
        headerRight: { width: 40 },
        headerTitle: { ...typographyScale.header, color: FLOW_TOKEN.ink },
        scroll: { flex: 1 },
        scrollContent: { alignItems: 'center', paddingHorizontal: FLOW_PAD },
        card: {
          borderRadius: RADIUS,
          overflow: 'hidden',
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        cardInner: { padding: PAD },
        profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
        avatar: {
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        },
        profileText: { flex: 1, minWidth: 0 },
        profileName: { ...typographyScale.bodyLarge, fontWeight: '700', color: colors.text },
        section: { marginBottom: 12 },
        sectionLabel: {
          ...typographyScale.caption,
          fontWeight: '600',
          color: colors.textSecondary,
          letterSpacing: 0.5,
          marginBottom: 6,
        },
        statsGrid: { flexDirection: 'row', gap: 10 },
        statCard: {
          flex: 1,
          backgroundColor: colors.accentSoft,
          borderRadius: 10,
          paddingVertical: 10,
          paddingHorizontal: 8,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.accentSoft,
        },
        statValue: { ...typographyScale.score, color: colors.primary, marginBottom: 2 },
        statLabel: { ...typographyScale.caption, fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
        calendarSub: { ...typographyScale.caption, color: colors.textSecondary, marginBottom: 4 },
        weekdayRow: { flexDirection: 'row', marginBottom: 2 },
        weekdayLabel: { flex: 1, ...typographyScale.caption, fontSize: 10, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
        calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
        cellWrap: { width: '14.28%', aspectRatio: 1, padding: 2 },
        cellEmpty: { flex: 1, backgroundColor: 'transparent' },
        cell: {
          flex: 1,
          borderRadius: 999,
          backgroundColor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        cellDay: { ...typographyScale.badge, color: colors.text },
        cellDayFilled: { color: colors.onPrimary, fontWeight: '600' },
        levelRowWrap: { flexDirection: 'row', gap: 10 },
        levelCol: { flex: 1 },
        levelType: { ...typographyScale.caption, fontSize: 11, fontWeight: '600', color: colors.primary, marginBottom: 2 },
        levelBarRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 1 },
        levelNum: { ...typographyScale.caption, fontSize: 10, fontWeight: '600', color: colors.textSecondary, width: 8, textAlign: 'right' as const },
        levelTrack: {
          flex: 1,
          height: 3,
          borderRadius: 1.5,
          backgroundColor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          overflow: 'hidden',
        },
        levelFillWord: { height: '100%', borderRadius: 1.5, backgroundColor: colors.primary },
        levelFillGrammar: { height: '100%', borderRadius: 1.5, backgroundColor: colors.grammarPrimary },
        appBadge: { marginTop: 2, alignItems: 'center' },
        appBadgeText: { ...typographyScale.caption, color: colors.textSecondary, fontWeight: '600' },
        editLink: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 14,
          gap: 4,
        },
        editLinkText: { ...typographyScale.button, color: colors.primary },
      }),
    [colors, resolvedMode, FLOW_TOKEN, SHADOW]
  );
  const gradientBg = useMemo<[string, string]>(() => [colors.background, colors.surface], [colors.background, colors.surface]);
  const cardGradient = useMemo<[string, string]>(() => [colors.card, colors.background], [colors.card, colors.background]);

  const refresh = useProgressStore((s) => s.refresh);
  const name = useProfileStore((s) => s.name);
  const displayName = useProfileStore((s) => s.displayName);
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const loadProfile = useProfileStore((s) => s.load);
  const uiLocale = displayLanguage;
  const pc = useMemo(() => getProfileCardStrings(uiLocale), [uiLocale]);
  const ht = useMemo(() => getHomeTabStrings(uiLocale), [uiLocale]);
  const dayLabels = ht.dayLabels;
  const wordCountByLevel = useWordsStore((s) => s.lessonCountByLevel) ?? {};
  const grammarCountByLevel = useGrammarStore((s) => s.lessonCountByLevel) ?? {};

  useFocusEffect(
    useCallback(() => {
      refresh();
      loadProfile();
    }, [refresh, loadProfile])
  );

  const streak = db.getStreak();
  const totalLessons = db.getTotalLessonsCleared();
  const now = new Date();
  const calYear = now.getFullYear();
  const calMonth = now.getMonth() + 1;
  const monthStats = db.getMonthlyStats(calYear, calMonth);
  const calendarCells = buildCalendarCells(calYear, calMonth, monthStats);

  const levelWord = LEVELS.map((lv) => ({
    level: lv,
    cleared: db.getLevelProgress(lv, 'word'),
    total: wordCountByLevel[lv] ?? 0,
  }));
  const levelGrammar = LEVELS.map((lv) => ({
    level: lv,
    cleared: db.getLevelProgress(lv, 'grammar'),
    total: grammarCountByLevel[lv] ?? 0,
  }));

  const displayNameStr = name.trim() || displayName.trim() || pc.learnerDefaultName;
  const cardWidth = Math.min(CARD_MAX_W, CONTENT_W);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientBg}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={[styles.headerFixed, { paddingTop: headerTop }]}>
        <View style={[styles.headerRow, { width: CONTENT_W }]}>
          <Pressable
            style={({ pressed }) => [styles.headerCircleBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              void triggerLightImpact();
              router.back();
            }}
            accessibilityLabel={pc.closeModalA11y}
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color={FLOW_TOKEN.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{pc.title}</Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: footerPaddingBottom + PAD }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { width: cardWidth }, SHADOW]}>
          <LinearGradient
            colors={cardGradient}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.cardInner}>
            {/* プロフィール */}
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={32} color={colors.primary} />
              </View>
              <View style={styles.profileText}>
                <Text style={styles.profileName} numberOfLines={1}>{displayNameStr}</Text>
              </View>
            </View>

            {/* 学習記録 */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{pc.sectionStudyRecord}</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{streak.current}</Text>
                  <Text style={styles.statLabel}>{pc.streakDaysLabel}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{streak.longest}</Text>
                  <Text style={styles.statLabel}>{pc.longestRecordLabel}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{totalLessons}</Text>
                  <Text style={styles.statLabel}>{pc.clearedLessonsLabel}</Text>
                </View>
              </View>
            </View>

            {/* 学習カレンダー（コンパクト） */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{pc.sectionCalendar}</Text>
              <Text style={styles.calendarSub}>{ht.calendarMonthLabel(calYear, calMonth)}</Text>
              <View style={styles.weekdayRow}>
                {dayLabels.map((d) => (
                  <Text key={d} style={styles.weekdayLabel}>{d}</Text>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {calendarCells.map((cell, i) => (
                  <View key={i} style={styles.cellWrap}>
                    {cell.type === 'empty' ? (
                      <View style={styles.cellEmpty} />
                    ) : (
                      <View
                        style={[
                          styles.cell,
                          (cell.lessonsCleared ?? 0) > 0 && {
                            backgroundColor: hexToRgba(colors.primary, 0.2 + Math.min(0.4, ((cell.lessonsCleared ?? 0) / 5) * 0.2)),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.cellDay,
                            (cell.lessonsCleared ?? 0) > 0 && styles.cellDayFilled,
                          ]}
                        >
                          {cell.day}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* レベル別進捗（横並び・バーのみ） */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{pc.sectionLevelProgress}</Text>
              <View style={styles.levelRowWrap}>
                <View style={styles.levelCol}>
                  <Text style={styles.levelType}>{ht.levelWordType}</Text>
                  {levelWord.map(({ level, cleared, total }) => {
                    const pct = total > 0 ? Math.min(100, (cleared / total) * 100) : 0;
                    return (
                      <View key={`w-${level}`} style={styles.levelBarRow}>
                        <Text style={styles.levelNum}>{level}</Text>
                        <View style={styles.levelTrack}>
                          <View style={[styles.levelFillWord, { width: `${pct}%` }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.levelCol}>
                  <Text style={[styles.levelType, { color: colors.grammarPrimary }]}>{ht.levelGrammarType}</Text>
                  {levelGrammar.map(({ level, cleared, total }) => {
                    const pct = total > 0 ? Math.min(100, (cleared / total) * 100) : 0;
                    return (
                      <View key={`g-${level}`} style={styles.levelBarRow}>
                        <Text style={styles.levelNum}>{level}</Text>
                        <View style={styles.levelTrack}>
                          <View style={[styles.levelFillGrammar, { width: `${pct}%` }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.appBadge}>
              <Text style={styles.appBadgeText}>TOPIK NEO</Text>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.editLink, pressed && { opacity: 0.8 }]}
          onPress={() => router.push('/settings')}
          accessibilityLabel={pc.editProfileLinkA11y}
          accessibilityRole="button"
        >
          <Text style={styles.editLinkText}>{pc.editProfileLink}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      </ScrollView>
    </View>
  );
}
