import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getWordsByLessonId } from '@/src/data/words';
import * as db from '@/src/db/database';
import { useWordsStore } from '@/src/store/wordsStore';
import { useSubscriptionStore } from '@/src/store/subscriptionStore';
import { FREE_LESSONS_PER_LEVEL } from '@/src/store/subscriptionStore';
import { useProfileStore } from '@/src/store/profileStore';
import { useTheme } from '@/src/contexts/ThemeContext';
import { getLessonStrings } from '@/src/i18n/lessons';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { triggerLightImpact, triggerSelectionHaptic } from '@/src/utils/haptics';
import { getConfiguredSpeechVolume, playStartSound } from '@/src/utils/quizSoundEffects';
import { spacing, radius, hexToRgba, GLASS_CARD_OPACITY, SAVED_STAR_YELLOW, FONT_SCALE_MAX } from '@/src/theme';
import { getSettingsFlowTokens, PAD as HEADER_PAD, CONTENT_W as HEADER_CONTENT_W, MIN_TOUCH } from '@/src/theme/settingsFlowTokens';
import {
  preloadGeneratedWordSpeech,
  speakWordWithGeneratedFallback,
  stopGeneratedWordSpeechPlayback,
} from '@/src/utils/generatedWordSpeech';

export default function LessonContentScreen() {
  const { resolvedMode } = useTheme();
  const { colors, typography, cardShadow, cardBorder, flowShadow: SHADOW } = useThemeStyles();
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
        emptyWrap: { padding: spacing.xl, alignItems: 'center' },
        empty: { ...typography.body, textAlign: 'center', marginBottom: spacing.sm },
        emptySub: { ...typography.bodySmall, textAlign: 'center', color: colors.textSecondary },
        wordCard: {
          backgroundColor: hexToRgba(colors.card, GLASS_CARD_OPACITY),
          borderRadius: radius.xl,
          padding: spacing.xl + 2,
          marginBottom: spacing.lg,
          ...cardBorder,
          ...cardShadow,
        },
        wordRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        },
        wordMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
        korean: { ...typography.korean, marginRight: spacing.sm },
        reading: { ...typography.bodySmall },
        speakButton: { padding: spacing.xs, marginRight: 2 },
        speakButtonPressed: { opacity: 0.7 },
        starButton: { padding: spacing.xs },
        japanese: { ...typography.body, marginBottom: spacing.sm, color: colors.text },
        /** 例文はカード内にフラットに収める（ネストした別ボックスにしない） */
        exampleSection: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.sm,
          marginTop: spacing.sm,
          paddingTop: spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        },
        exampleTextWrap: { flex: 1, minWidth: 0 },
        exampleKorean: {
          fontSize: 18,
          fontWeight: '700',
          color: colors.text,
          marginBottom: 6,
          lineHeight: 28,
        },
        exampleJapanese: {
          fontSize: 15,
          lineHeight: 22,
          color: colors.translationMutedOnCard,
        },
        exampleSpeakButton: { padding: spacing.xs, marginTop: 2 },
        footer: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: spacing.lg,
          paddingTop: 10,
          paddingBottom: 10,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        quizButtonWrap: { borderRadius: radius.xl, overflow: 'hidden', ...cardShadow },
        quizButton: { height: 52, justifyContent: 'center', alignItems: 'center' },
        quizButtonText: { fontSize: 17, fontWeight: '600', color: colors.onPrimary },
      }),
    [colors, typography, cardShadow, cardBorder, TOKEN, SHADOW]
  );
  const { level, lessonId } = useLocalSearchParams<{ level: string; lessonId: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const isSubscribed = useSubscriptionStore((s) => s.isSubscribed);
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const lessonT = useMemo(
    () => getLessonStrings(displayLanguage),
    [displayLanguage]
  );
  const { headerPaddingTop, tabBarPaddingBottom } = useSafeArea();
  const wordsLoaded = useWordsStore((s) => s.wordsLoadedFromSupabase);
  const wordsContentLocale = useWordsStore((s) => s.wordsContentLocale);
  const words = useMemo(() => getWordsByLessonId(lessonId ?? ''), [lessonId, wordsLoaded, wordsContentLocale, displayLanguage]);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set(words.map((w) => w.id).filter((id) => db.isWordSaved(id))));

  const lessonNum = lessonId?.replace(/^ko_W\d+_/, '') || '';
  const lessonNumInt = parseInt(lessonNum, 10) || 1;
  const levelStr = level ?? '1';

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false, title: '' });
  }, [navigation]);

  useEffect(() => {
    if (lessonNumInt > FREE_LESSONS_PER_LEVEL && !isSubscribed) {
      router.replace('/subscription');
      return;
    }
  }, [lessonNumInt, isSubscribed, router]);

  useEffect(() => {
    setSavedIds(new Set(words.map((w) => w.id).filter((id) => db.isWordSaved(id))));
  }, [words]);

  useEffect(() => {
    return () => {
      void stopGeneratedWordSpeechPlayback();
    };
  }, []);

  useEffect(() => {
    if (words.length === 0) return;
    void (async () => {
      for (const w of words) {
        await preloadGeneratedWordSpeech('word', w.korean);
        await preloadGeneratedWordSpeech('example', w.example.korean);
      }
    })();
  }, [words]);

  const handleSpeak = (sourceType: 'word' | 'example', korean: string) => {
    void speakWordWithGeneratedFallback(sourceType, korean, {
      language: 'ko-KR',
      rate: 0.9,
      volume: getConfiguredSpeechVolume(),
    });
  };

  const handleStar = (wordId: string) => {
    void triggerSelectionHaptic();
    const nowSaved = db.toggleSavedWord(wordId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (nowSaved) next.add(wordId);
      else next.delete(wordId);
      return next;
    });
  };

  const handleQuizStart = () => {
    if (lessonId) {
      void playStartSound();
      router.push(`/quiz/word/${lessonId}`);
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
            accessibilityLabel={lessonT.backA11y}
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
        {words.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.empty} maxFontSizeMultiplier={FONT_SCALE_MAX}>
              {lessonT.wordLessonEmpty}
            </Text>
            <Text style={styles.emptySub} maxFontSizeMultiplier={FONT_SCALE_MAX}>
              {lessonT.wordLessonEmptySub}
            </Text>
          </View>
        ) : (
          words.map((w) => (
            <View key={w.id} style={styles.wordCard}>
              <View style={styles.wordRow}>
                <View style={styles.wordMain}>
                  <Text style={styles.korean} numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={FONT_SCALE_MAX}>
                    {w.korean}
                  </Text>
                  <Text style={styles.reading} numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={FONT_SCALE_MAX}>
                    {w.reading}
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.speakButton, pressed && styles.speakButtonPressed]}
                  onPress={() => handleSpeak('word', w.korean)}
                  accessibilityLabel={lessonT.speakWord}
                  accessibilityRole="button"
                >
                  <Ionicons name="volume-high-outline" size={24} color={colors.primary} />
                </Pressable>
                <Pressable onPress={() => handleStar(w.id)} style={styles.starButton}>
                  <Ionicons
                    name={savedIds.has(w.id) ? 'star' : 'star-outline'}
                    size={26}
                    color={savedIds.has(w.id) ? SAVED_STAR_YELLOW : colors.textSecondary}
                  />
                </Pressable>
              </View>
              <Text style={styles.japanese} numberOfLines={2} ellipsizeMode="tail" maxFontSizeMultiplier={FONT_SCALE_MAX}>
                {w.japanese}
              </Text>
              <View style={styles.exampleSection}>
                <View style={styles.exampleTextWrap}>
                  <Text style={styles.exampleKorean} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                    {w.example.korean}
                  </Text>
                  <Text style={styles.exampleJapanese} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                    {w.example.japanese}
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.exampleSpeakButton, pressed && styles.speakButtonPressed]}
                  onPress={() => handleSpeak('example', w.example.korean)}
                  accessibilityLabel={lessonT.speakExample}
                  accessibilityRole="button"
                >
                  <Ionicons name="volume-high-outline" size={22} color={colors.primary} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
      {words.length > 0 && (
        <View style={[styles.footer, { paddingBottom: tabBarPaddingBottom + 10 }]}>
          <Pressable style={styles.quizButtonWrap} onPress={handleQuizStart} accessibilityLabel={lessonT.quizStart} accessibilityRole="button">
            <LinearGradient
              colors={[colors.primary, colors.primaryEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.quizButton}
            >
              <Text style={styles.quizButtonText} maxFontSizeMultiplier={FONT_SCALE_MAX}>
                {lessonT.quizStart}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}
