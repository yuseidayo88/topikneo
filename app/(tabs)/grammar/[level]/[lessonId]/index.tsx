import { useEffect, useLayoutEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import {
  getGrammarByLessonId,
  getGrammarReorderItems,
  grammarTitleForSpeech,
  lessonUsesGeneratedGrammarTts,
  type GrammarItem,
} from '@/src/data/grammar';
import { useGrammarStore } from '@/src/store/grammarStore';
import { useSubscriptionStore, FREE_LESSONS_PER_LEVEL } from '@/src/store/subscriptionStore';
import { useProfileStore } from '@/src/store/profileStore';
import { useTheme } from '@/src/contexts/ThemeContext';
import { getLessonStrings } from '@/src/i18n/lessons';
import { getGrammarTabStrings } from '@/src/i18n/appScreens';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { triggerLightImpact } from '@/src/utils/haptics';
import { getConfiguredSpeechVolume, playStartSound } from '@/src/utils/quizSoundEffects';
import { spacing, radius, hexToRgba, GLASS_CARD_OPACITY, FONT_SCALE_MAX } from '@/src/theme';
import { getSettingsFlowTokens, PAD as HEADER_PAD, CONTENT_W as HEADER_CONTENT_W, MIN_TOUCH } from '@/src/theme/settingsFlowTokens';
import {
  preloadGeneratedWordSpeech,
  preloadGrammarHeadingAudio,
  speakGrammarHeading,
  speakWordWithGeneratedFallback,
  stopGeneratedWordSpeechPlayback,
} from '@/src/utils/generatedWordSpeech';

export default function GrammarLessonScreen() {
  const { resolvedMode } = useTheme();
  const { colors, typography, cardShadow, cardBorder, flowShadow: SHADOW } = useThemeStyles();
  const { level, lessonId } = useLocalSearchParams<{ level: string; lessonId: string }>();
  const navigation = useNavigation();
  const router = useRouter();
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
  const { headerPaddingTop, tabBarPaddingBottom } = useSafeArea();
  const grammarContentLocale = useGrammarStore((s) => s.grammarContentLocale);
  const items = useMemo(() => getGrammarByLessonId(lessonId ?? ''), [lessonId, grammarContentLocale]);
  const quizCount = useMemo(() => getGrammarReorderItems(lessonId ?? '').length, [lessonId, grammarContentLocale]);
  const lessonNum = lessonId?.replace(/^ko_G\d+_/, '') ?? '';
  const lessonNumInt = parseInt(lessonNum, 10) || 1;
  const hasQuiz = quizCount > 0;
  const levelStr = level ?? '1';
  const shouldUseGeneratedForLesson = lessonUsesGeneratedGrammarTts(lessonId);

  useEffect(() => {
    if (lessonNumInt > FREE_LESSONS_PER_LEVEL && !isSubscribed) {
      router.replace('/subscription');
    }
  }, [lessonNumInt, isSubscribed, router]);
  const TOKEN = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        /* 1本の View でヘッダー全体。重なり防止のため zIndex で前面に */
        headerFixed: {
          position: 'relative',
          zIndex: 10,
          elevation: 10,
          paddingHorizontal: HEADER_PAD,
          alignItems: 'center',
          backgroundColor: TOKEN.bg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
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
          minWidth: MIN_TOUCH,
          minHeight: MIN_TOUCH,
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
        scroll: { flex: 1 },
        scrollContent: { padding: spacing.lg },
        empty: { ...typography.bodySmall, textAlign: 'center', marginTop: spacing.xl },
        grammarCard: {
          backgroundColor: hexToRgba(colors.card, GLASS_CARD_OPACITY),
          borderRadius: radius.xl,
          padding: spacing.xl + 2,
          marginBottom: spacing.lg,
          ...cardBorder,
          ...cardShadow,
        },
        titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm, gap: spacing.sm },
        grammarTitle: { flex: 1, fontSize: 19, fontWeight: '700', color: colors.grammarOnCard, lineHeight: 26 },
        meaningLabel: {
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 0.4,
          color: colors.textMutedOnCard,
          marginBottom: 6,
          marginTop: 2,
        },
        explanation: { ...typography.body, color: colors.text, lineHeight: 24, marginBottom: spacing.md },
        structureBox: {
          backgroundColor: colors.background,
          borderRadius: radius.lg,
          padding: spacing.md,
          marginBottom: spacing.lg,
          borderWidth: resolvedMode === 'dark' ? 1 : 0,
          borderColor: colors.border,
        },
        structureLabel: {
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 0.4,
          color: colors.textMutedOnCard,
          marginBottom: 6,
        },
        structureText: { ...typography.body, color: colors.text, fontFamily: undefined, lineHeight: 24 },
        examplesBlock: { marginTop: spacing.md },
        examplesLabel: {
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 0.4,
          color: colors.textMutedOnCard,
          marginBottom: spacing.md,
        },
        exampleRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginBottom: spacing.lg,
          gap: spacing.sm,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          marginHorizontal: -spacing.sm,
          borderRadius: radius.md,
          backgroundColor: resolvedMode === 'dark' ? hexToRgba(colors.text, 0.04) : 'transparent',
        },
        exampleTextWrap: { flex: 1, minWidth: 0 },
        exampleKorean: {
          fontSize: 18,
          fontWeight: '700',
          color: colors.text,
          lineHeight: 28,
        },
        exampleJapanese: {
          fontSize: 15,
          color: colors.translationMutedOnCard,
          marginTop: 6,
          lineHeight: 22,
        },
        speakButton: { padding: spacing.xs, marginTop: 2 },
        speakButtonPressed: { opacity: 0.7 },
        examplesPlaceholder: { ...typography.bodySmall, color: colors.translationMutedOnCard },
        footer: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: spacing.lg,
          paddingTop: 10,
          paddingBottom: 10,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        },
        quizNotice: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.sm },
        quizButtonWrap: { borderRadius: radius.xl, overflow: 'hidden', height: 52 },
        quizButtonDisabled: { opacity: 0.6 },
        quizButton: { height: 52, justifyContent: 'center', alignItems: 'center' },
        quizButtonText: { fontSize: 17, fontWeight: '600', color: colors.onPrimary },
        quizButtonTextDisabled: { opacity: 0.9 },
      }),
    [colors, typography, cardShadow, cardBorder, TOKEN, SHADOW, resolvedMode]
  );

  const handleSpeakHeading = (g: GrammarItem) => {
    const vol = getConfiguredSpeechVolume();
    if (shouldUseGeneratedForLesson) {
      void speakGrammarHeading(g, { language: 'ko-KR', rate: 0.9, volume: vol });
      return;
    }
    Speech.stop();
    if (vol <= 0) return;
    const headingSpeak = grammarTitleForSpeech(g);
    if (!headingSpeak.trim()) return;
    Speech.speak(headingSpeak, { language: 'ko-KR', rate: 0.9, volume: vol });
  };

  const handleSpeak = (korean: string) => {
    const vol = getConfiguredSpeechVolume();
    if (shouldUseGeneratedForLesson) {
      void speakWordWithGeneratedFallback('example', korean, { language: 'ko-KR', rate: 0.9, volume: vol });
      return;
    }
    Speech.stop();
    if (vol <= 0) return;
    Speech.speak(korean, { language: 'ko-KR', rate: 0.9, volume: vol });
  };

  useEffect(() => {
    return () => {
      if (shouldUseGeneratedForLesson) {
        void stopGeneratedWordSpeechPlayback();
      } else {
        Speech.stop();
      }
    };
  }, [shouldUseGeneratedForLesson]);

  useEffect(() => {
    if (!shouldUseGeneratedForLesson || items.length === 0) return;
    void (async () => {
      for (const g of items) {
        await preloadGrammarHeadingAudio(g);
        for (const ex of g.examples) {
          await preloadGeneratedWordSpeech('example', ex.korean);
        }
      }
    })();
  }, [shouldUseGeneratedForLesson, items]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false, title: '' });
  }, [navigation]);

  const handleQuizStart = () => {
    if (lessonId) {
      void playStartSound();
      router.push(`/(tabs)/grammar/quiz/${lessonId}`);
    }
  };

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
            hitSlop={{ top: Math.max(headerPaddingTop, 24), bottom: 12, left: 16, right: 16 }}
            accessibilityLabel={gt.backA11y}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color={TOKEN.ink} />
          </Pressable>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={FONT_SCALE_MAX}>
            {lessonT.lessonWithLevel(levelStr, lessonNum.padStart(2, '0'))}
          </Text>
          <View style={styles.headerRight} />
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 76 + tabBarPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <Text style={styles.empty} maxFontSizeMultiplier={FONT_SCALE_MAX}>
            {gt.lessonEmpty}
          </Text>
        ) : (
          items.map((g) => (
            <View key={g.id} style={styles.grammarCard}>
              <View style={styles.titleRow}>
                <Text style={styles.grammarTitle} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                  {g.title}
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.speakButton, pressed && styles.speakButtonPressed]}
                  onPress={() => handleSpeakHeading(g)}
                  accessibilityLabel={gt.speakGrammarA11y}
                  accessibilityRole="button"
                >
                  <Ionicons name="volume-high-outline" size={24} color={colors.grammarOnCard} />
                </Pressable>
              </View>
              <Text style={styles.meaningLabel} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                {gt.meaningLabel}
              </Text>
              <Text style={styles.explanation} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                {g.explanation}
              </Text>
              {g.structure.trim() !== g.title.trim() && (
                <View style={styles.structureBox}>
                  <Text style={styles.structureLabel} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                    {gt.shapeLabel}
                  </Text>
                  <Text style={styles.structureText} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                    {g.structure}
                  </Text>
                </View>
              )}
              <View style={styles.examplesBlock}>
                <Text style={styles.examplesLabel} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                  {gt.examplesLabel}
                </Text>
                {g.examples.length > 0 ? (
                  g.examples.map((ex, i) => (
                    <View key={i} style={styles.exampleRow}>
                      <View style={styles.exampleTextWrap}>
                        <Text style={styles.exampleKorean} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                          {ex.korean}
                        </Text>
                        <Text style={styles.exampleJapanese} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                          {ex.translation}
                        </Text>
                      </View>
                      <Pressable
                        style={({ pressed }) => [styles.speakButton, pressed && styles.speakButtonPressed]}
                        onPress={() => handleSpeak(ex.korean)}
                        accessibilityLabel={gt.speakExampleA11y}
                        accessibilityRole="button"
                      >
                        <Ionicons name="volume-high-outline" size={24} color={colors.grammarOnCard} />
                      </Pressable>
                    </View>
                  ))
                ) : (
                  <Text style={styles.examplesPlaceholder} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                    {gt.examplesPlaceholder}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
      {items.length > 0 && (
        <View style={[styles.footer, { paddingBottom: tabBarPaddingBottom + 10 }]}>
          {!hasQuiz && (
            <Text style={styles.quizNotice} maxFontSizeMultiplier={FONT_SCALE_MAX}>
              {gt.quizPreparing}
            </Text>
          )}
          <Pressable
            style={({ pressed }) => [styles.quizButtonWrap, pressed && hasQuiz && { opacity: 0.9 }, !hasQuiz && styles.quizButtonDisabled]}
            onPress={hasQuiz ? handleQuizStart : undefined}
            disabled={!hasQuiz}
            accessibilityLabel={hasQuiz ? gt.quizStart : gt.quizPreparing}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[colors.grammarPrimary, colors.grammarPrimaryEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.quizButton}
            >
              <Text
                style={[styles.quizButtonText, !hasQuiz && styles.quizButtonTextDisabled]}
                maxFontSizeMultiplier={FONT_SCALE_MAX}
              >
                {hasQuiz ? gt.quizStart : gt.quizButtonDisabledShort}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}
