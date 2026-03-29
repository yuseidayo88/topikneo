import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { useProfileStore, type DisplayLanguage } from '@/src/store/profileStore';
import { useWordsStore } from '@/src/store/wordsStore';
import { useGrammarStore } from '@/src/store/grammarStore';
import { applyReminder } from '@/src/utils/reminder';
import { getContentLocaleFromDisplayLanguage } from '@/src/utils/contentLocale';
import { getDisplayLanguageScreenStrings } from '@/src/i18n/appScreens';
import { APP_LOCALES, APP_LOCALE_LABELS } from '@/src/i18n/appLocale';
import { triggerLightImpact, triggerSelectionHaptic } from '@/src/utils/haptics';
import { typographyScale } from '@/src/theme';
import { getSettingsFlowTokens, RADIUS, PAD, CONTENT_W } from '@/src/theme/settingsFlowTokens';

export default function DisplayLanguageScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { resolvedMode } = useTheme();
  const { flowShadow: SHADOW } = useThemeStyles();
  const { headerPaddingTop, footerPaddingBottom } = useSafeArea();
  const TOKEN = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const saveStore = useProfileStore((s) => s.save);
  const loadWords = useWordsStore((s) => s.loadWordsFromSupabase);
  const loadGrammar = useGrammarStore((s) => s.loadGrammarFromSupabase);
  const uiLocale = displayLanguage;
  const screenStr = useMemo(() => getDisplayLanguageScreenStrings(uiLocale), [uiLocale]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        headerFixed: { paddingHorizontal: PAD, alignItems: 'center', backgroundColor: 'transparent' },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 16,
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
        headerTitle: { ...typographyScale.header, color: TOKEN.ink },
        headerRight: { width: 40 },
        scroll: { flex: 1 },
        scrollContent: { paddingHorizontal: PAD, alignItems: 'center', paddingBottom: footerPaddingBottom + PAD },
        wrap: { width: CONTENT_W },
        hint: { ...typographyScale.bodySmall, color: TOKEN.inkMuted, lineHeight: 21, marginBottom: 16 },
        listCard: { backgroundColor: TOKEN.surface, borderRadius: RADIUS.card, overflow: 'hidden', borderWidth: 1, borderColor: TOKEN.border, ...SHADOW },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 16,
          paddingHorizontal: PAD,
          minHeight: 54,
        },
        rowActive: { backgroundColor: TOKEN.accentSoft },
        rowLeft: { ...typographyScale.body, color: TOKEN.ink },
        check: { ...typographyScale.section, color: TOKEN.ink },
        rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: TOKEN.border, marginLeft: PAD },
      }),
    [TOKEN, SHADOW, footerPaddingBottom]
  );

  const handleSelect = async (lang: DisplayLanguage) => {
    void triggerSelectionHaptic();
    await saveStore({ displayLanguage: lang });
    await applyReminder(lang);
    const contentLocale = getContentLocaleFromDisplayLanguage(lang);
    await Promise.all([loadWords(contentLocale), loadGrammar(contentLocale)]);
    if (navigation.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/settings');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[TOKEN.bg, TOKEN.bgEnd]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View style={[styles.headerFixed, { paddingTop: headerPaddingTop }]}> 
        <View style={[styles.headerRow, { width: CONTENT_W }]}> 
          <Pressable
            style={({ pressed }) => [styles.headerCircleBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              void triggerLightImpact();
              if (navigation.canGoBack()) {
                router.back();
                return;
              }
              router.replace('/settings');
            }}
            accessibilityLabel={screenStr.backA11y}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color={TOKEN.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{screenStr.title}</Text>
          <View style={styles.headerRight} />
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrap}>
          <Text style={styles.hint}>{screenStr.hint}</Text>
          <View style={styles.listCard}>
            {APP_LOCALES.map((lang, index) => (
              <View key={lang}>
                {index > 0 && <View style={styles.rowDivider} />}
                <Pressable
                  style={[styles.row, displayLanguage === lang && styles.rowActive]}
                  onPress={() => handleSelect(lang)}
                  accessibilityLabel={screenStr.selectLanguageA11y(APP_LOCALE_LABELS[lang])}
                  accessibilityRole="button"
                >
                  <Text style={styles.rowLeft}>{APP_LOCALE_LABELS[lang]}</Text>
                  {displayLanguage === lang ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
