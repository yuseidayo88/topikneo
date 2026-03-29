import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { getWordsByIds, type WordItem } from '@/src/data/words';
import * as db from '@/src/db/database';
import { useWordsStore } from '@/src/store/wordsStore';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { EmptyStateBlock } from '@/src/components/EmptyStateBlock';
import { TabHeader } from '@/src/components/TabHeader';
import { triggerLightImpact, triggerSelectionHaptic } from '@/src/utils/haptics';
import { getConfiguredSpeechVolume, playStartSound } from '@/src/utils/quizSoundEffects';
import { getSettingsFlowTokens, type ShadowToken } from '@/src/theme/settingsFlowTokens';
import { SAVED_STAR_YELLOW, typographyScale } from '@/src/theme';
import { useProfileStore } from '@/src/store/profileStore';
import { getEmptyStateStrings, getSavedTabStrings } from '@/src/i18n/appScreens';
import { useContentColumnWidth } from '@/src/hooks/useContentColumnWidth';
import {
  preloadGeneratedWordSpeech,
  speakWordWithGeneratedFallback,
  stopGeneratedWordSpeechPlayback,
} from '@/src/utils/generatedWordSpeech';

const RADIUS = { card: 24 };
const PAD = 24;
const GAP = 24;
const MIN_TOUCH = 44;

export default function SavedScreen() {
  const contentW = useContentColumnWidth(PAD);
  const router = useRouter();
  const { resolvedMode } = useTheme();
  const { flowShadow: SHADOW } = useThemeStyles();
  const { headerPaddingTop, tabBarPaddingBottom } = useSafeArea();
  useWordsStore((s) => s.wordsContentLocale);
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const locale = displayLanguage;
  const emptyStr = useMemo(() => getEmptyStateStrings(locale), [locale]);
  const savedStr = useMemo(() => getSavedTabStrings(locale), [locale]);
  const [wordIds, setWordIds] = useState<string[]>([]);

  const baseToken = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const TOKEN = useMemo(() => ({ ...baseToken, streak: SAVED_STAR_YELLOW }), [baseToken]);
  const styles = useMemo(() => createSavedTabStyles(TOKEN, SHADOW, resolvedMode), [TOKEN, SHADOW, resolvedMode]);
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

  useFocusEffect(useCallback(() => {
    setWordIds(db.getSavedWordIds());
  }, []));

  useFocusEffect(
    useCallback(() => {
      return () => {
        void stopGeneratedWordSpeechPlayback();
      };
    }, [])
  );

  const words = getWordsByIds(wordIds);

  useEffect(() => {
    if (words.length === 0) return;
    void (async () => {
      for (const w of words.slice(0, 20)) {
        await preloadGeneratedWordSpeech('word', w.korean);
      }
    })();
  }, [words]);

  return (
    <ErrorBoundary contextLabel={savedStr.headerTitle}>
    <View style={styles.container}>
      <LinearGradient
        colors={[TOKEN.bg, TOKEN.bgEnd]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <TabHeader
        title={savedStr.headerTitle}
        subtitle={savedStr.headerSubtitle(words.length)}
        paddingTop={headerPaddingTop}
        contentWidth={contentW}
        theme={headerTheme}
        shadow={SHADOW}
      />

      {words.length === 0 ? (
        <EmptyStateBlock
          icon="star-outline"
          iconSize={56}
          title={emptyStr.savedTitle}
          subtitle={emptyStr.savedSubtitle}
          buttonLabel={emptyStr.savedButton}
          onPress={() => {
            void triggerLightImpact();
            router.replace('/(tabs)/vocabulary');
          }}
          accessibilityLabel={emptyStr.savedBrowseA11y}
        />
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 76 + tabBarPaddingBottom }]}
            showsVerticalScrollIndicator={false}
            accessibilityRole="list"
            accessibilityLabel={savedStr.listA11y}
          >
            <View style={[styles.wrap, { width: contentW }]}>
              {words.map((w: WordItem) => (
                <View key={w.id} style={styles.wordCardWrap} accessibilityLabel={`${w.korean}、${w.japanese}`}>
                  <View style={styles.wordCard}>
                  <View style={styles.heroAccent} />
                  <View style={styles.wordCardInner}>
                    <View style={styles.wordMain}>
                      <Text style={styles.wordKorean} numberOfLines={1} ellipsizeMode="tail">{w.korean}</Text>
                      <Text style={styles.wordReading} numberOfLines={1} ellipsizeMode="tail">{w.reading}</Text>
                    </View>
                    <Text style={styles.wordJapanese} numberOfLines={2} ellipsizeMode="tail">{w.japanese}</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      void speakWordWithGeneratedFallback('word', w.korean, {
                        language: 'ko-KR',
                        rate: 0.9,
                        volume: getConfiguredSpeechVolume(),
                      });
                    }}
                    style={styles.speakBtn}
                    accessibilityLabel={savedStr.speakA11y}
                    accessibilityRole="button"
                  >
                    <Ionicons name="volume-high-outline" size={22} color={TOKEN.accent} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void triggerSelectionHaptic();
                      db.toggleSavedWord(w.id);
                      setWordIds(db.getSavedWordIds());
                    }}
                    style={styles.starBtn}
                    accessibilityLabel={savedStr.unsaveA11y}
                    accessibilityRole="button"
                  >
                    <Ionicons name="star" size={24} color={TOKEN.streak} />
                  </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: tabBarPaddingBottom + 10 }]}>
            <Pressable
              style={({ pressed }) => [styles.quizBtn, pressed && { opacity: 0.9 }]}
              onPress={() => {
                void playStartSound();
                router.push('/quiz/saved');
              }}
              accessibilityLabel={savedStr.quizButtonA11y}
              accessibilityRole="button"
            >
              <Text style={styles.quizBtnText}>{savedStr.quizButton}</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
    </ErrorBoundary>
  );
}

type SavedToken = ReturnType<typeof getSettingsFlowTokens> & { streak: string };

function createSavedTabStyles(TOKEN: SavedToken, SHADOW: ShadowToken, _resolvedMode: 'light' | 'dark') {
  return StyleSheet.create({
    container: { flex: 1 },
    emptyBody: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: PAD },
    emptyIcon: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: TOKEN.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: GAP,
      borderWidth: 1,
      borderColor: TOKEN.border,
      ...SHADOW,
    },
    emptyTitle: { ...typographyScale.header, color: TOKEN.ink, marginBottom: 8 },
    emptyText: { ...typographyScale.bodySmall, color: TOKEN.inkMuted, textAlign: 'center', marginBottom: 20 },
    emptyButton: {
      backgroundColor: TOKEN.accent,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 14,
    },
    emptyButtonText: { ...typographyScale.button, color: '#FFF' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: PAD, alignItems: 'center' },
    wrap: { gap: 12 },
    wordCardWrap: {
      borderRadius: RADIUS.card,
      borderWidth: 1,
      borderColor: TOKEN.border,
      backgroundColor: TOKEN.surface,
      ...SHADOW,
    },
    wordCard: {
      flexDirection: 'row',
      borderRadius: RADIUS.card,
      overflow: 'hidden',
    },
    heroAccent: { width: 5, backgroundColor: TOKEN.accent },
    wordCardInner: { flex: 1, padding: PAD, minWidth: 0 },
    wordMain: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 6 },
    wordKorean: { ...typographyScale.section, color: TOKEN.ink, marginRight: 8 },
    wordReading: { ...typographyScale.caption, color: TOKEN.inkMuted },
    wordJapanese: { ...typographyScale.bodySmall, color: TOKEN.inkMuted },
    speakBtn: { paddingHorizontal: 12, justifyContent: 'center' },
    starBtn: { paddingHorizontal: 16, justifyContent: 'center' },
    footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: PAD, paddingTop: 10, paddingBottom: 10, backgroundColor: TOKEN.bg, borderTopWidth: 1, borderTopColor: TOKEN.border },
    quizBtn: { height: 52, borderRadius: RADIUS.card, backgroundColor: TOKEN.accent, justifyContent: 'center', alignItems: 'center' },
    quizBtnText: { ...typographyScale.button, color: '#FFF', fontSize: 17 },
  });
}
