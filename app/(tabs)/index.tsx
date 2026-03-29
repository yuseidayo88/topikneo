import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Animated,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as db from '@/src/db/database';
import { useProgressStore } from '@/src/store/progressStore';
import { useOnboardingStore } from '@/src/store/onboardingStore';
import { useWordsStore } from '@/src/store/wordsStore';
import { useGrammarStore } from '@/src/store/grammarStore';
import { useSubscriptionStore } from '@/src/store/subscriptionStore';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { triggerLightImpact, triggerSelectionHaptic } from '@/src/utils/haptics';
import { getSettingsFlowTokens, type ShadowToken } from '@/src/theme/settingsFlowTokens';
import { useContentColumnWidth } from '@/src/hooks/useContentColumnWidth';
import { hexToRgba, typographyScale } from '@/src/theme';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { useProfileStore } from '@/src/store/profileStore';
import { getHomeTabStrings } from '@/src/i18n/appScreens';

const TOPIK_LEVELS = [1, 2, 3, 4, 5, 6] as const;

type HomeToken = ReturnType<typeof getSettingsFlowTokens>;

const RADIUS = { card: 24, pill: 999, dot: 4 };

const PAD = 24;
const GAP = 24;
const REVEAL_DURATION = 280;
const REVEAL_DELAY = 50;
const MIN_TOUCH = 44;

export default function HomeScreen() {
  const contentW = useContentColumnWidth(PAD);
  const router = useRouter();
  const { resolvedMode } = useTheme();
  const { flowShadow: SHADOW } = useThemeStyles();
  const refresh = useProgressStore((s) => s.refresh);
  /** refresh / ローカルDB更新のたびに増える。db を直接読むだけだと zustand 更新で再描画されないため購読する */
  const progressDataRevision = useProgressStore((s) => s.dataRevision);
  void progressDataRevision;
  const { headerPaddingTop, tabBarPaddingBottom } = useSafeArea();
  const dailyGoalWord = useOnboardingStore((s) => s.dailyGoalWordLessons);
  const dailyGoalGrammar = useOnboardingStore((s) => s.dailyGoalGrammarLessons);
  const uiLang = useProfileStore((s) => s.displayLanguage);
  const ht = useMemo(() => getHomeTabStrings(uiLang), [uiLang]);
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return ht.greetingMorning;
    if (h >= 11 && h < 17) return ht.greetingAfternoon;
    return ht.greetingEvening;
  }, [ht.greetingMorning, ht.greetingAfternoon, ht.greetingEvening]);

  const TOKEN = useMemo<HomeToken>(
    () => getSettingsFlowTokens(resolvedMode),
    [resolvedMode]
  );
  /** styles の useMemo より前に定義（createHomeStyles で参照するため） */
  const upgradeCardBorderColor = useMemo(() => 'rgba(30,64,175,0.4)', []);
  const styles = useMemo(
    () =>
      createHomeStyles(TOKEN, {
        upgradeBorder: upgradeCardBorderColor,
        dark: resolvedMode === 'dark',
        SHADOW,
      }),
    [TOKEN, upgradeCardBorderColor, resolvedMode, SHADOW]
  );
  const todayWordCleared = db.getTodayLessonsClearedByType('word');
  const todayGrammarCleared = db.getTodayLessonsClearedByType('grammar');
  const streak = db.getStreak();
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [refreshing, setRefreshing] = useState(false);
  const monthStats = db.getMonthlyStats(calendarYear, calendarMonth);
  const wordLessonCountByLevel = useWordsStore((s) => s.lessonCountByLevel) ?? {};
  const grammarLessonCountByLevel = useGrammarStore((s) => s.lessonCountByLevel) ?? {};
  const isSubscribed = useSubscriptionStore((s) => s.isSubscriptionActive)();
  const upgradeGradient = useMemo<[string, string]>(
    () => (resolvedMode === 'dark' ? ['rgba(30,64,175,0.22)', 'rgba(30,64,175,0.14)'] : ['#DBEAFE', '#C7D2FE']),
    [resolvedMode]
  );

  const levelProgressWord = TOPIK_LEVELS.map((lv) => ({
    level: lv,
    cleared: db.getLevelProgress(lv, 'word'),
    total: wordLessonCountByLevel[lv] ?? 0,
  }));
  const levelProgressGrammar = TOPIK_LEVELS.map((lv) => ({
    level: lv,
    cleared: db.getLevelProgress(lv, 'grammar'),
    total: grammarLessonCountByLevel[lv] ?? 0,
  }));

  const weekData = db.getWeeklyStats();
  const weekTotal = weekData.reduce((s, d) => s + d.lessonsCleared, 0);
  const weekMax = Math.max(1, ...weekData.map((x) => x.lessonsCleared));
  const GAUGE_HEIGHT = 80;
  const scrollRef = useRef<ScrollView | null>(null);

  const wordPct = dailyGoalWord > 0 ? Math.min(100, (todayWordCleared / dailyGoalWord) * 100) : 0;
  const grammarPct = dailyGoalGrammar > 0 ? Math.min(100, (todayGrammarCleared / dailyGoalGrammar) * 100) : 0;
  const streakPct = streak.longest > 0 ? Math.min(100, (streak.current / streak.longest) * 100) : 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    const now = new Date();
    setCalendarYear(now.getFullYear());
    setCalendarMonth(now.getMonth() + 1);
    setRefreshing(false);
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      refresh();
      const now = new Date();
      setCalendarYear(now.getFullYear());
      setCalendarMonth(now.getMonth() + 1);
    }, [refresh])
  );

  useEffect(() => {
    (async () => {
      await AsyncStorage.removeItem('kla_onboarding_just_completed');
      await AsyncStorage.removeItem('kla_show_account_prompt');
      await AsyncStorage.removeItem('kla_show_today_spotlight');
    })();
  }, []);

  const dayLabels = ht.dayLabels;
  const firstDay = new Date(calendarYear, calendarMonth - 1, 1);
  const firstWeekday = firstDay.getDay();
  const lastDay = new Date(calendarYear, calendarMonth, 0).getDate();
  const monthStr = String(calendarMonth).padStart(2, '0');
  const calendarCells: { type: 'empty' | 'day'; day?: number; date?: string; lessonsCleared?: number }[] = [];
  for (let i = 0; i < 42; i++) {
    if (i < firstWeekday || i >= firstWeekday + lastDay) {
      calendarCells.push({ type: 'empty' });
    } else {
      const day = i - firstWeekday + 1;
      const dateStr = `${calendarYear}-${monthStr}-${String(day).padStart(2, '0')}`;
      calendarCells.push({ type: 'day', day, date: dateStr, lessonsCleared: monthStats[dateStr] ?? 0 });
    }
  }

  const goPrevMonth = () => {
    void triggerSelectionHaptic();
    if (calendarMonth === 1) { setCalendarYear((y) => y - 1); setCalendarMonth(12); }
    else setCalendarMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    void triggerSelectionHaptic();
    if (calendarMonth === 12) { setCalendarYear((y) => y + 1); setCalendarMonth(1); }
    else setCalendarMonth((m) => m + 1);
  };

  const reveal = useRef([0, 1, 2, 3, 4, 5, 6].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    reveal.forEach((v, i) => {
      Animated.timing(v, {
        toValue: 1,
        duration: REVEAL_DURATION,
        delay: i * REVEAL_DELAY,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  const blockStyle = (i: number) => ({
    opacity: reveal[i],
    transform: [
      { translateY: reveal[i].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
    ],
  });

  return (
    <ErrorBoundary contextLabel={ht.errorBoundaryContext}>
    <View style={styles.container}>
      <LinearGradient
        colors={[TOKEN.bg, TOKEN.bgEnd]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {/* 固定ヘッダー */}
      <View style={[styles.headerFixed, { paddingTop: headerPaddingTop }]}>
        <View style={[styles.headerFixedInner, { width: contentW }]}>
          <Animated.View style={blockStyle(0)}>
            <View style={styles.header}>
              <Pressable
                style={({ pressed }) => [styles.headerProfile, pressed && { opacity: 0.8 }]}
                onPress={() => router.push('/profile-card')}
                accessibilityLabel={ht.profileCardA11y}
                accessibilityRole="button"
                accessibilityHint={ht.profileCardHint}
              >
                <View style={styles.headerAvatar}>
                  <Ionicons name="person" size={24} color={TOKEN.accent} />
                </View>
              </Pressable>
              <View style={styles.headerCenter}>
                <Text style={styles.greeting}>{greeting}</Text>
                <Text style={styles.subGreeting}>{ht.subGreeting}</Text>
              </View>
              <Pressable
                onPress={() => {
                  void triggerLightImpact();
                  router.push('/settings');
                }}
                style={({ pressed }) => [styles.headerSettingsCircle, pressed && { opacity: 0.85 }]}
                accessibilityLabel={ht.settingsA11y}
                accessibilityRole="button"
                accessibilityHint={ht.settingsHint}
              >
                <Ionicons name="settings-outline" size={22} color={TOKEN.inkMuted} />
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarPaddingBottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={TOKEN.accent}
          />
        }
      >
        <View style={[styles.wrap, { width: contentW }]}>
          {/* Hero — streak card: 0-day = CTA / 1+ = number + weekly dots */}
          <Animated.View style={blockStyle(1)}>
            <View style={styles.heroShadowWrap}>
              <Pressable
                style={[styles.hero, streak.current === 0 && styles.heroZero]}
                onPress={streak.current === 0 ? () => router.replace('/(tabs)/vocabulary') : undefined}
                accessibilityLabel={
                  streak.current === 0
                    ? ht.streakCtaStart + '。' + ht.streakSubStart
                    : `${ht.streakTitle} ${streak.current}${ht.streakUnit}${streak.longest > 0 ? `。${ht.streakLongest(streak.longest)}` : ''}`
                }
                accessibilityRole={streak.current === 0 ? 'button' : 'none'}
                accessibilityHint={streak.current === 0 ? ht.streakSubStart : undefined}
              >
                <View style={styles.heroAccent} />
                <View style={styles.heroInner}>
                  <Text style={styles.heroLabel}>{ht.streakTitle}</Text>
                  {streak.current === 0 ? (
                    <>
                      <View style={styles.streakZeroContent}>
                        <View style={styles.streakIconWrap}>
                          <Ionicons name="flame-outline" size={36} color={TOKEN.accent} />
                        </View>
                        <Text style={styles.heroZeroTitle}>{ht.streakCtaStart}</Text>
                        <Text style={styles.heroZeroSub}>{ht.streakSubStart}</Text>
                        <View style={styles.streakCtaPill}>
                          <Ionicons name="book" size={18} color="#FFF" />
                          <Text style={styles.streakCtaPillText}>{ht.streakHintStart}</Text>
                        </View>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.streakRow}>
                        <View style={styles.streakIconWrap}>
                          <Ionicons name="flame" size={28} color={TOKEN.accent} />
                        </View>
                        <View style={styles.streakNumberWrap}>
                          <Text style={styles.streakNumber}>{streak.current}</Text>
                          <Text style={styles.streakUnit}>{ht.streakUnit}</Text>
                        </View>
                      </View>
                      {streak.longest > 0 && (
                        <Text style={styles.streakMeta}>{ht.streakLongest(streak.longest)}</Text>
                      )}
                      {streak.longest > 0 && (
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${streakPct}%` }]} />
                        </View>
                      )}
                      <View style={styles.streakWeekRow}>
                        <Text style={styles.streakWeekLabel}>{ht.streakWeekLabel}</Text>
                        <View style={styles.streakDots}>
                          {weekData.map((day) => (
                            <View
                              key={day.date}
                              style={[
                                styles.streakDot,
                                day.lessonsCleared > 0 && styles.streakDotFilled,
                              ]}
                            />
                          ))}
                        </View>
                      </View>
                      <Text style={styles.streakHint}>{ht.streakHintContinue}</Text>
                    </>
                  )}
                </View>
              </Pressable>
            </View>
          </Animated.View>

          {/* アップグレード PRO（設定と同じ・未購入時のみ） */}
          {!isSubscribed && (
            <Animated.View style={blockStyle(2)}>
              <Pressable
                style={({ pressed }) => [styles.upgradeCard, pressed && { opacity: 0.95 }]}
                onPress={() => {
                  void triggerLightImpact();
                  router.push('/subscription');
                }}
                accessibilityLabel={ht.upgradeCardA11y}
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={upgradeGradient}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.upgradeContent}>
                  <View style={styles.upgradeHead}>
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                    <View style={styles.upgradeRecommendBadge}>
                      <Text style={styles.upgradeRecommendText}>{ht.upgradeRecommend}</Text>
                    </View>
                  </View>
                  <Text style={styles.upgradeTitle}>{ht.upgradeTitle}</Text>
                  <Text style={styles.upgradeDesc}>
                    {ht.upgradeDesc}
                  </Text>
                  <View style={styles.upgradeBenefits}>
                    <View style={styles.upgradeBenefitRow}>
                      <Ionicons name="school" size={16} color={TOKEN.accent} />
                      <Text style={styles.upgradeBenefitText}>{ht.upgradeBenefit1}</Text>
                    </View>
                    <View style={styles.upgradeBenefitRow}>
                      <Ionicons name="chatbubble-ellipses" size={16} color={TOKEN.accent} />
                      <Text style={styles.upgradeBenefitText}>{ht.upgradeBenefit2}</Text>
                    </View>
                    <View style={styles.upgradeBenefitRow}>
                      <Ionicons name="refresh" size={16} color={TOKEN.accent} />
                      <Text style={styles.upgradeBenefitText}>{ht.upgradeBenefit3}</Text>
                    </View>
                    <View style={styles.upgradeBenefitRow}>
                      <Ionicons name="bookmark" size={16} color={TOKEN.accent} />
                      <Text style={styles.upgradeBenefitText}>{ht.upgradeBenefit4}</Text>
                    </View>
                  </View>
                  <View style={styles.upgradeButton}>
                    <Ionicons name="diamond" size={18} color="#FFF" />
                    <Text style={styles.upgradeButtonText}>{ht.upgradeCta}</Text>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          )}

          {/* Today — bento grid */}
          <Animated.View style={blockStyle(3)}>
            <Text style={styles.sectionEyebrow}>{ht.todayGoalEyebrow}</Text>
            <View style={styles.sectionHeadRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>{ht.todayTodoTitle}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.linkPill, pressed && { opacity: 0.85 }]}
                onPress={() => {
                  void triggerLightImpact();
                  router.push('/daily-goal');
                }}
                accessibilityLabel={ht.changeGoalA11y}
                accessibilityRole="button"
                accessibilityHint={ht.changeGoalHint}
              >
                <Text style={styles.linkText}>{ht.changeGoal}</Text>
                <Ionicons name="chevron-forward" size={14} color={TOKEN.accent} />
              </Pressable>
            </View>
            <View style={styles.bento}>
              <Pressable
                style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
                onPress={() => {
                  void triggerLightImpact();
                  router.replace('/(tabs)/vocabulary');
                }}
                accessibilityLabel={ht.tileWordA11y(todayWordCleared, dailyGoalWord, dailyGoalWord > 0)}
                accessibilityRole="button"
              >
                <View style={[styles.tileIcon, { backgroundColor: TOKEN.accentSoft }]}>
                  <Ionicons name="book-outline" size={22} color={TOKEN.accent} />
                </View>
                <Text style={styles.tileLabel}>{ht.tileWord}</Text>
                {dailyGoalWord > 0 ? (
                  <Text style={[styles.tileValue, todayWordCleared >= dailyGoalWord && { color: TOKEN.success }]}>
                    {todayWordCleared >= dailyGoalWord ? ht.clearLabel : `${todayWordCleared} / ${dailyGoalWord}`}
                  </Text>
                ) : (
                  <Text style={styles.tileMuted}>{ht.noGoalLabel}</Text>
                )}
                {dailyGoalWord > 0 && (
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${wordPct}%` }]} />
                  </View>
                )}
                <View style={styles.tileFooter}>
                  <Text style={styles.tileHint}>{dailyGoalWord > 0 ? ht.openHint : ht.setGoalHint}</Text>
                  <Ionicons name="chevron-forward" size={12} color={TOKEN.inkFaint} />
                </View>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
                onPress={() => {
                  void triggerLightImpact();
                  router.replace('/(tabs)/grammar');
                }}
                accessibilityLabel={ht.tileGrammarA11y(todayGrammarCleared, dailyGoalGrammar, dailyGoalGrammar > 0)}
                accessibilityRole="button"
              >
                <View style={[styles.tileIcon, { backgroundColor: TOKEN.grammarSoft }]}>
                  <Ionicons name="document-text-outline" size={22} color={TOKEN.grammar} />
                </View>
                <Text style={styles.tileLabel}>{ht.tileGrammar}</Text>
                {dailyGoalGrammar > 0 ? (
                  <Text style={[styles.tileValue, todayGrammarCleared >= dailyGoalGrammar && { color: TOKEN.success }]}>
                    {todayGrammarCleared >= dailyGoalGrammar ? ht.clearLabel : `${todayGrammarCleared} / ${dailyGoalGrammar}`}
                  </Text>
                ) : (
                  <Text style={styles.tileMuted}>{ht.noGoalLabel}</Text>
                )}
                {dailyGoalGrammar > 0 && (
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFillGrammar, { width: `${grammarPct}%` }]} />
                  </View>
                )}
                <View style={styles.tileFooter}>
                  <Text style={styles.tileHint}>{dailyGoalGrammar > 0 ? ht.openHint : ht.setGoalHint}</Text>
                  <Ionicons name="chevron-forward" size={12} color={TOKEN.inkFaint} />
                </View>
              </Pressable>
            </View>
          </Animated.View>

          {/* 今週の学習 — 縦バー（バー本体のみグラデ） */}
          <Animated.View style={blockStyle(4)}>
            <Text style={styles.sectionEyebrow}>{ht.weekEyebrow}</Text>
            <View style={styles.weekCard} accessibilityLabel={ht.weekCardA11y(weekTotal)}>
              <View style={styles.weekCardAccent} />
              <View style={styles.weekCardInner}>
                <View style={styles.weekCardHeader}>
                  <Text style={styles.weekCardTitle}>{ht.weekTitle}</Text>
                  <View style={styles.weekCardPill}>
                    <Text style={styles.weekCardPillText}>{ht.weekTotalLessons(weekTotal)}</Text>
                  </View>
                </View>
                <View style={styles.weekGaugeRow}>
                  {weekData.map((d, idx) => {
                    const dayIndex = new Date(d.date + 'T12:00:00.000Z').getDay();
                    const weekdayLabel = dayLabels[dayIndex];
                    const fillH = weekMax > 0 ? Math.max(10, (d.lessonsCleared / weekMax) * GAUGE_HEIGHT) : 0;
                    const isCurrentDay = idx === weekData.length - 1;
                    return (
                      <View
                        key={d.date}
                        style={[styles.weekGaugeWrap, isCurrentDay && styles.weekGaugeWrapToday]}
                      >
                        {d.lessonsCleared > 0 ? (
                          <Text style={styles.weekGaugeValue}>{d.lessonsCleared}</Text>
                        ) : (
                          <View style={styles.weekGaugeValueSpacer} />
                        )}
                        <View style={[styles.weekGaugeTrack, { height: GAUGE_HEIGHT + 8 }]}>
                          {d.lessonsCleared === 0 ? (
                            <View style={styles.weekGaugeInactiveCap} />
                          ) : (
                            <LinearGradient
                              colors={
                                isCurrentDay
                                  ? [hexToRgba(TOKEN.accent, 0.95), hexToRgba(TOKEN.accent, 0.5)]
                                  : [hexToRgba(TOKEN.accent, 0.82), hexToRgba(TOKEN.accent, 0.42)]
                              }
                              style={[styles.weekGaugeFill, { height: fillH }]}
                              start={{ x: 0.5, y: 1 }}
                              end={{ x: 0.5, y: 0 }}
                            />
                          )}
                        </View>
                        <Text style={[styles.weekGaugeLabel, isCurrentDay && styles.weekGaugeLabelToday]}>
                          {weekdayLabel}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Calendar */}
          <Animated.View style={blockStyle(5)}>
            <Text style={styles.sectionEyebrow}>{ht.recordEyebrow}</Text>
            <View style={styles.calendarCard}>
              <Text style={styles.calendarTitle}>{ht.calendarTitle}</Text>
              <Text style={styles.calendarSub}>{ht.calendarSub}</Text>
              <View style={styles.calendarNav}>
                <Pressable
                  onPress={goPrevMonth}
                  style={({ pressed }) => [styles.navBtnGhost, pressed && styles.navBtnGhostPressed]}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel={ht.prevMonthA11y}
                  accessibilityRole="button"
                >
                  <Ionicons name="chevron-back" size={26} color={TOKEN.accent} />
                </Pressable>
                <Text style={styles.calendarMonth}>{ht.calendarMonthLabel(calendarYear, calendarMonth)}</Text>
                <Pressable
                  onPress={goNextMonth}
                  style={({ pressed }) => [styles.navBtnGhost, pressed && styles.navBtnGhostPressed]}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel={ht.nextMonthA11y}
                  accessibilityRole="button"
                >
                  <Ionicons name="chevron-forward" size={26} color={TOKEN.accent} />
                </Pressable>
              </View>
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
                      <Pressable
                        style={[
                          styles.cell,
                          (cell.lessonsCleared ?? 0) > 0 && {
                            backgroundColor: hexToRgba(TOKEN.accent, 0.25 + Math.min(0.5, ((cell.lessonsCleared ?? 0) / 5) * 0.25)),
                          },
                        ]}
                        onPress={() => {
                          void triggerSelectionHaptic();
                          const dateStr = cell.date ?? '';
                          const byType = dateStr ? db.getDailyStatsByType(dateStr) : { word: 0, grammar: 0 };
                          const total = cell.lessonsCleared ?? 0;
                          const detail = total > 0
                            ? ht.dayDetailAlert(byType.word, byType.grammar, total)
                            : ht.recordNone;
                          Alert.alert(
                            ht.dayAlertTitle(calendarYear, calendarMonth, cell.day ?? 1),
                            detail
                          );
                        }}
                        accessibilityLabel={ht.calendarDayA11y(calendarMonth, cell.day ?? 0, cell.lessonsCleared ?? 0)}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.cellDay,
                            (cell.lessonsCleared ?? 0) > 0 && styles.cellDayFilled,
                          ]}
                        >
                          {cell.day}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* レベル別進捗（カレンダーの下） */}
          <Animated.View style={blockStyle(6)}>
            <Text style={styles.sectionEyebrow}>{ht.levelSectionEyebrow}</Text>
            <View style={styles.sectionHeadRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>{ht.levelProgressTitle}</Text>
              </View>
            </View>
            <View style={styles.levelProgressCardWrap}>
              <View style={styles.levelProgressCard}>
                <View style={styles.levelProgressAccent} />
                <View style={styles.levelProgressInner}>
                  <Text style={styles.levelProgressType}>{ht.levelWordType}</Text>
                  {levelProgressWord.map(({ level, cleared, total }) => {
                  const pct = total > 0 ? Math.min(100, (cleared / total) * 100) : 0;
                  return (
                    <Pressable
                      key={`w-${level}`}
                      style={styles.levelProgressRow}
                      onPress={() => router.replace({ pathname: '/(tabs)/vocabulary/[level]', params: { level: String(level) } })}
                    >
                      <Text style={styles.levelProgressLabel}>{ht.levelNLabel(level)}</Text>
                      <View style={styles.levelProgressTrack}>
                        <View style={[styles.levelProgressFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.levelProgressCount}>
                        {total > 0 ? `${cleared}/${total}` : '—'}
                      </Text>
                    </Pressable>
                  );
                })}
                </View>
              </View>
            </View>
            <View style={styles.levelProgressCardWrap}>
              <View style={styles.levelProgressCard}>
                <View style={[styles.levelProgressAccent, { backgroundColor: TOKEN.grammar }]} />
                <View style={styles.levelProgressInner}>
                  <Text style={[styles.levelProgressType, { color: TOKEN.grammar }]}>{ht.levelGrammarType}</Text>
                  {levelProgressGrammar.map(({ level, cleared, total }) => {
                  const pct = total > 0 ? Math.min(100, (cleared / total) * 100) : 0;
                  return (
                    <Pressable
                      key={`g-${level}`}
                      style={styles.levelProgressRow}
                      onPress={() => router.replace({ pathname: '/(tabs)/grammar/[level]', params: { level: String(level) } })}
                    >
                      <Text style={styles.levelProgressLabel}>{ht.levelNLabel(level)}</Text>
                      <View style={styles.levelProgressTrack}>
                        <View style={[styles.levelProgressFillGrammar, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.levelProgressCount}>
                        {total > 0 ? `${cleared}/${total}` : '—'}
                      </Text>
                    </Pressable>
                  );
                })}
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
    </ErrorBoundary>
  );
}

function createHomeStyles(
  TOKEN: HomeToken,
  opts: { upgradeBorder: string; dark: boolean; SHADOW: ShadowToken }
) {
  const SHADOW = opts.SHADOW;
  return StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },
    headerFixed: {
      paddingHorizontal: PAD,
      alignItems: 'center',
      backgroundColor: TOKEN.bg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: TOKEN.border,
    },
    headerFixedInner: {},
    scrollContent: { paddingHorizontal: PAD, alignItems: 'center', paddingTop: 4 },
    wrap: { gap: GAP },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 12,
    },
    headerProfile: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: MIN_TOUCH,
    },
    headerAvatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: TOKEN.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'rgba(30,64,175,0.35)',
      ...SHADOW,
    },
    headerSettingsCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: TOKEN.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: TOKEN.border,
      ...SHADOW,
    },
    headerCenter: { flex: 1, marginHorizontal: 14, alignItems: 'flex-start', justifyContent: 'center' },
    greeting: {
      ...typographyScale.section,
      fontSize: 22,
      color: TOKEN.ink,
      letterSpacing: -0.6,
      marginBottom: 2,
      lineHeight: 28,
      textAlign: 'left',
    },
    subGreeting: {
      ...typographyScale.caption,
      color: TOKEN.inkMuted,
      letterSpacing: 0.15,
      lineHeight: 18,
      textAlign: 'left',
    },
    iconBtn: {
      minHeight: MIN_TOUCH,
      justifyContent: 'center',
    },

    welcomeCard: {
      backgroundColor: TOKEN.surface,
      borderRadius: RADIUS.card,
      padding: PAD + 2,
      borderWidth: 1,
      borderColor: opts.upgradeBorder ?? TOKEN.border,
      ...SHADOW,
      overflow: 'hidden',
    },
    welcomeEyebrow: {
      ...typographyScale.caption,
      fontWeight: '700',
      color: TOKEN.accent,
      letterSpacing: 1.2,
      marginBottom: 8,
    },
    welcomeTitle: { ...typographyScale.header, color: TOKEN.ink, marginBottom: 6, letterSpacing: -0.3 },
    welcomeSub: { ...typographyScale.bodySmall, color: TOKEN.inkMuted, marginBottom: 16, lineHeight: 21 },
    welcomeRow: { flexDirection: 'row', gap: 12 },
    btnPrimary: {
      backgroundColor: TOKEN.accent,
      paddingVertical: 13,
      paddingHorizontal: 22,
      borderRadius: 14,
      shadowColor: TOKEN.accent,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.28,
      shadowRadius: 6,
      elevation: 4,
    },
    btnPrimaryText: { ...typographyScale.button, color: '#FFF' },
    btnSecondary: {
      paddingVertical: 13,
      paddingHorizontal: 22,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: TOKEN.accent,
      backgroundColor: opts.dark ? 'rgba(30,64,175,0.08)' : 'rgba(30,64,175,0.06)',
    },
    btnSecondaryText: { ...typographyScale.button, color: TOKEN.accent },

    accountCard: {
      backgroundColor: TOKEN.surface,
      borderRadius: RADIUS.card,
      padding: PAD + 2,
      borderWidth: 1,
      borderColor: opts.upgradeBorder ?? TOKEN.border,
      ...SHADOW,
      overflow: 'hidden',
      marginTop: 12,
    },
    accountTitle: { ...typographyScale.header, color: TOKEN.ink, marginBottom: 6, letterSpacing: -0.3 },
    accountSub: { ...typographyScale.bodySmall, color: TOKEN.inkMuted, marginBottom: 16, lineHeight: 21 },

    upgradeCard: {
      borderRadius: RADIUS.card,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: opts.upgradeBorder,
      ...SHADOW,
      position: 'relative',
    },
    upgradeContent: { padding: PAD },
    upgradeHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    proBadge: {
      backgroundColor: TOKEN.accent,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
    },
    proBadgeText: { ...typographyScale.badge, color: '#FFF', fontWeight: '700', letterSpacing: 0.5 },
    upgradeRecommendBadge: {
      backgroundColor: opts.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: RADIUS.pill,
    },
    upgradeRecommendText: { ...typographyScale.caption, fontWeight: '600', color: TOKEN.inkMuted },
    upgradeTitle: { ...typographyScale.bodyLarge, fontWeight: '700', color: TOKEN.ink, marginBottom: 6 },
    upgradeDesc: { ...typographyScale.caption, color: TOKEN.inkMuted, lineHeight: 20, marginBottom: 12 },
    upgradeBenefits: { gap: 8, marginBottom: 16 },
    upgradeBenefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    upgradeBenefitText: { ...typographyScale.bodySmall, fontWeight: '500', color: TOKEN.ink },
    upgradeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: TOKEN.accent,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 14,
      gap: 8,
      shadowColor: TOKEN.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    },
    upgradeButtonText: { ...typographyScale.button, color: '#FFF', fontWeight: '700' },

    heroShadowWrap: {
      backgroundColor: TOKEN.surface,
      borderRadius: RADIUS.card,
      borderWidth: 1,
      borderColor: opts.upgradeBorder ?? TOKEN.border,
      ...SHADOW,
    },
    hero: {
      flexDirection: 'row',
      backgroundColor: TOKEN.surface,
      borderRadius: RADIUS.card,
      overflow: 'hidden',
    },
    heroZero: {
      backgroundColor: opts.dark ? 'rgba(30,64,175,0.06)' : 'rgba(30,64,175,0.04)',
    },
    heroAccent: {
      width: 5,
      backgroundColor: TOKEN.accent,
    },
    heroInner: { flex: 1, padding: PAD + 2 },
    heroLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: TOKEN.inkMuted,
      letterSpacing: 1.4,
      marginBottom: 12,
    },
    streakZeroContent: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    heroZeroTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: TOKEN.ink,
      marginTop: 12,
      letterSpacing: -0.5,
    },
    heroZeroSub: {
      ...typographyScale.bodySmall,
      color: TOKEN.inkMuted,
      marginTop: 6,
      textAlign: 'center',
      lineHeight: 20,
    },
    streakCtaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 14,
      backgroundColor: TOKEN.accent,
      ...SHADOW,
    },
    streakCtaPillText: { ...typographyScale.button, color: '#FFF', fontWeight: '700' },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 4,
    },
    streakNumberWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    streakIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: TOKEN.accentSoft,
      borderWidth: 1,
      borderColor: TOKEN.accentSoft,
    },
    streakNumber: {
      fontSize: 52,
      fontWeight: '800',
      color: TOKEN.ink,
      letterSpacing: -2.5,
    },
    streakUnit: { ...typographyScale.section, fontWeight: '600', color: TOKEN.ink },
    streakMeta: { ...typographyScale.caption, color: TOKEN.inkMuted, marginTop: 6 },
    progressTrack: {
      height: 5,
      borderRadius: RADIUS.pill,
      backgroundColor: TOKEN.progressTrackBg,
      marginTop: 8,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: RADIUS.pill, backgroundColor: TOKEN.accent },
    progressFillGrammar: { height: '100%', borderRadius: RADIUS.pill, backgroundColor: TOKEN.grammar },
    streakWeekRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      gap: 8,
    },
    streakWeekLabel: { ...typographyScale.caption, fontWeight: '600', color: TOKEN.inkMuted },
    streakDots: { flexDirection: 'row', gap: 6 },
    streakDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: TOKEN.progressTrackBg,
      borderWidth: 1.5,
      borderColor: TOKEN.border,
    },
    streakDotFilled: {
      backgroundColor: TOKEN.accent,
      borderColor: TOKEN.accent,
    },
    streakHint: { ...typographyScale.badge, color: TOKEN.inkMuted, marginTop: 10 },

    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    sectionEyebrow: {
      fontSize: 12,
      fontWeight: '700',
      color: TOKEN.inkMuted,
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    sectionHeadRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    sectionAccent: {
      width: 4,
      height: 22,
      borderRadius: 4,
      backgroundColor: TOKEN.accent,
      marginRight: 10,
    },
    sectionTitle: { ...typographyScale.header, color: TOKEN.ink, flex: 1, letterSpacing: -0.3 },
    spotlightCard: {
      backgroundColor: TOKEN.accentSoft,
      borderRadius: RADIUS.card,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: TOKEN.accent,
      ...SHADOW,
    },
    spotlightText: { ...typographyScale.bodySmall, color: TOKEN.ink, marginBottom: 10 },
    spotlightButton: {
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: TOKEN.accent,
    },
    spotlightButtonText: { ...typographyScale.button, fontSize: 14, color: '#FFF' },
    link: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      minHeight: MIN_TOUCH,
      justifyContent: 'flex-end',
    },
    linkText: { ...typographyScale.caption, fontWeight: '600', color: TOKEN.accentText },
    linkPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: RADIUS.pill,
      backgroundColor: TOKEN.accentSoft,
    },
    bento: { flexDirection: 'row', gap: 14 },
    tile: {
      flex: 1,
      aspectRatio: 1,
      maxHeight: 168,
      backgroundColor: TOKEN.surface,
      borderRadius: RADIUS.card,
      padding: 14,
      borderWidth: 1,
      borderColor: TOKEN.border,
      ...SHADOW,
      justifyContent: 'space-between',
    },
    tilePressed: { opacity: 0.94 },
    tileFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 2,
      marginTop: 2,
    },
    tileHint: { ...typographyScale.caption, fontSize: 11, fontWeight: '600', color: TOKEN.inkFaint },

    weekCard: {
      flexDirection: 'row',
      backgroundColor: TOKEN.surface,
      borderRadius: RADIUS.card,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: TOKEN.border,
      ...SHADOW,
    },
    weekCardAccent: { width: 5, backgroundColor: TOKEN.accent },
    weekCardInner: { flex: 1, padding: PAD },
    weekCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 18,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: TOKEN.border,
    },
    weekCardTitle: {
      ...typographyScale.bodyLarge,
      fontWeight: '800',
      color: TOKEN.ink,
      letterSpacing: -0.35,
    },
    weekCardPill: {
      backgroundColor: opts.dark ? hexToRgba(TOKEN.accent, 0.2) : hexToRgba(TOKEN.accent, 0.09),
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: hexToRgba(TOKEN.accent, opts.dark ? 0.3 : 0.14),
    },
    weekCardPillText: { ...typographyScale.badge, color: TOKEN.accentText, fontWeight: '700', letterSpacing: 0.15 },
    weekGaugeRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2 },
    weekGaugeWrap: { flex: 1, alignItems: 'center', minWidth: 0 },
    weekGaugeWrapToday: {
      paddingVertical: 6,
      paddingHorizontal: 1,
      marginBottom: -2,
      borderRadius: 14,
      backgroundColor: hexToRgba(TOKEN.accent, opts.dark ? 0.1 : 0.05),
    },
    weekGaugeValue: {
      ...typographyScale.caption,
      fontWeight: '700',
      color: TOKEN.accentText,
      marginBottom: 6,
      fontVariant: ['tabular-nums'],
    },
    weekGaugeValueSpacer: { height: 22, marginBottom: 6 },
    weekGaugeTrack: {
      width: 20,
      borderRadius: 10,
      backgroundColor: opts.dark ? hexToRgba(TOKEN.ink, 0.1) : hexToRgba(TOKEN.ink, 0.06),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hexToRgba(TOKEN.ink, opts.dark ? 0.14 : 0.08),
      justifyContent: 'flex-end',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
    },
    weekGaugeInactiveCap: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 5,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
      backgroundColor: hexToRgba(TOKEN.ink, opts.dark ? 0.12 : 0.08),
    },
    weekGaugeFill: {
      position: 'absolute',
      bottom: 0,
      left: 1,
      right: 1,
      borderTopLeftRadius: 9,
      borderTopRightRadius: 9,
      minHeight: 10,
      overflow: 'hidden',
    },
    weekGaugeLabel: {
      ...typographyScale.caption,
      fontWeight: '600',
      color: TOKEN.inkFaint,
      marginTop: 10,
      fontSize: 11,
      letterSpacing: 0.3,
    },
    weekGaugeLabelToday: { color: TOKEN.accentText, fontWeight: '800' },

    levelProgressCardWrap: {
      backgroundColor: TOKEN.surface,
      borderRadius: RADIUS.card,
      borderWidth: 1,
      borderColor: opts.upgradeBorder ?? TOKEN.border,
      ...SHADOW,
      marginBottom: 14,
    },
    levelProgressCard: {
      flexDirection: 'row',
      backgroundColor: TOKEN.surface,
      borderRadius: RADIUS.card,
      overflow: 'hidden',
    },
    levelProgressAccent: { width: 4, backgroundColor: TOKEN.accent },
    levelProgressInner: { flex: 1, padding: PAD },
    levelProgressType: { ...typographyScale.body, fontWeight: '700', color: TOKEN.accentText, marginBottom: 12 },
    levelProgressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
      paddingVertical: 2,
    },
    levelProgressLabel: { ...typographyScale.bodySmall, fontWeight: '600', color: TOKEN.ink, width: 28 },
    levelProgressTrack: {
      flex: 1,
      height: 8,
      borderRadius: RADIUS.pill,
      backgroundColor: TOKEN.progressTrackBg,
      overflow: 'hidden',
    },
    levelProgressFill: { height: '100%', borderRadius: RADIUS.pill, backgroundColor: TOKEN.accent },
    levelProgressFillGrammar: { height: '100%', borderRadius: RADIUS.pill, backgroundColor: TOKEN.grammar },
    levelProgressCount: { ...typographyScale.caption, fontWeight: '600', color: TOKEN.inkMuted, minWidth: 36, textAlign: 'right' },

    tileIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
      borderWidth: 1,
      borderColor: opts.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    tileLabel: { ...typographyScale.body, fontWeight: '700', color: TOKEN.ink, marginBottom: 4, letterSpacing: -0.2 },
    tileValue: { ...typographyScale.body, fontWeight: '700', color: TOKEN.accentText },
    tileMuted: { ...typographyScale.bodySmall, color: TOKEN.inkFaint },

    calendarCard: {
      backgroundColor: TOKEN.surface,
      borderRadius: RADIUS.card,
      padding: PAD + 2,
      borderWidth: 1,
      borderColor: opts.upgradeBorder ?? TOKEN.border,
      ...SHADOW,
    },
    calendarTitle: { ...typographyScale.bodyLarge, fontWeight: '700', color: TOKEN.ink, marginBottom: 6, letterSpacing: -0.3 },
    calendarSub: { ...typographyScale.caption, color: TOKEN.inkMuted, marginBottom: 16, lineHeight: 21 },
    calendarNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingVertical: 2,
      paddingHorizontal: 0,
    },
    navBtnGhost: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: 'transparent',
    },
    navBtnGhostPressed: { opacity: 0.45 },
    calendarMonth: {
      ...typographyScale.body,
      fontWeight: '800',
      color: TOKEN.ink,
      letterSpacing: -0.35,
      fontSize: 18,
      flex: 1,
      textAlign: 'center',
    },
    weekdayRow: { flexDirection: 'row', marginBottom: 6 },
    weekdayLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 12,
      color: TOKEN.inkFaint,
    },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    cellWrap: { width: '14.28%', aspectRatio: 1, padding: 2 },
    cellEmpty: { flex: 1 },
    cell: {
      flex: 1,
      borderRadius: RADIUS.pill,
      backgroundColor: TOKEN.cellBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellDay: { ...typographyScale.badge, color: TOKEN.ink },
    cellDayFilled: { color: '#FFF', fontWeight: '600' },
  });
}
