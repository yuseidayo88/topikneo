import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { useOnboardingStore } from '@/src/store/onboardingStore';
import { triggerLightImpact, triggerSelectionHaptic } from '@/src/utils/haptics';
import { setDatabaseTimezone } from '@/src/db/database';
import { getDeviceTimezone } from '@/src/utils/timezone';
import { useProfileStore } from '@/src/store/profileStore';
import { getTimezoneScreenStrings, getTimezoneRows } from '@/src/i18n/flowScreens';
import { typographyScale } from '@/src/theme';
import { getSettingsFlowTokens, RADIUS, PAD, GAP, CONTENT_W } from '@/src/theme/settingsFlowTokens';

export default function TimezoneScreen() {
  const router = useRouter();
  const { resolvedMode } = useTheme();
  const { flowShadow: SHADOW } = useThemeStyles();
  const { headerPaddingTop, footerPaddingBottom } = useSafeArea();
  const TOKEN = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const tz = useMemo(
    () => getTimezoneScreenStrings(displayLanguage),
    [displayLanguage]
  );
  const timezoneRows = useMemo(
    () => getTimezoneRows(displayLanguage),
    [displayLanguage]
  );
  const userTimezone = useOnboardingStore((s) => s.userTimezone);
  const setUserTimezone = useOnboardingStore((s) => s.setUserTimezone);
  const isDevice = userTimezone === null;

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
        scrollContent: { paddingHorizontal: PAD, alignItems: 'center' },
        wrap: { gap: GAP },
        sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
        sectionAccent: { width: 3, height: 20, borderRadius: 4, backgroundColor: TOKEN.accent, marginRight: 10 },
        sectionTitle: { ...typographyScale.section, color: TOKEN.ink, flex: 1 },
        description: { ...typographyScale.bodySmall, color: TOKEN.inkMuted, marginBottom: 16, lineHeight: 20 },
        listCard: {
          backgroundColor: TOKEN.surface,
          borderRadius: RADIUS.card,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: TOKEN.border,
          ...SHADOW,
        },
        optionRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 16,
          paddingHorizontal: PAD,
        },
        optionRowActive: { backgroundColor: TOKEN.accentSoft },
        divider: { height: 1, backgroundColor: TOKEN.divider, marginLeft: PAD + 44 + 12 },
        optionIconWrap: {
          width: 44,
          height: 44,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: TOKEN.accentSoft,
          marginRight: 12,
        },
        optionLabel: { ...typographyScale.bodyMedium, color: TOKEN.ink, flex: 1 },
        optionLabelActive: { color: TOKEN.accent, fontWeight: '600' },
        badge: {
          backgroundColor: TOKEN.accent,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: RADIUS.pill,
        },
        badgeText: { ...typographyScale.badge, color: '#FFF' },
      }),
    [TOKEN, SHADOW]
  );

  const handleSelect = async (value: string | null) => {
    void triggerSelectionHaptic();
    await setUserTimezone(value);
    const tzToApply = value ?? getDeviceTimezone();
    setDatabaseTimezone(tzToApply);
    router.back();
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
              router.back();
            }}
            accessibilityLabel={tz.backA11y}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color={TOKEN.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{tz.title}</Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: footerPaddingBottom + PAD }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.wrap, { width: CONTENT_W }]}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>{tz.sectionTitle}</Text>
          </View>
          <Text style={styles.description}>
            {tz.description}
          </Text>

          <View style={styles.listCard}>
            <Pressable
              style={[styles.optionRow, isDevice && styles.optionRowActive]}
              onPress={() => handleSelect(null)}
            >
              <View style={styles.optionIconWrap}>
                <Ionicons name="phone-portrait-outline" size={22} color={TOKEN.accent} />
              </View>
              <Text style={[styles.optionLabel, isDevice && styles.optionLabelActive]}>{tz.matchDevice}</Text>
              {isDevice && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tz.currentBadge}</Text>
                </View>
              )}
            </Pressable>
            {timezoneRows.map(({ value, label }) => {
              const isSelected = userTimezone === value;
              return (
                <View key={value}>
                  <View style={styles.divider} />
                  <Pressable
                    style={[styles.optionRow, isSelected && styles.optionRowActive]}
                    onPress={() => handleSelect(value)}
                  >
                    <View style={styles.optionIconWrap}>
                      <Ionicons name="globe-outline" size={22} color={TOKEN.accent} />
                    </View>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>{label}</Text>
                    {isSelected && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{tz.currentBadge}</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
