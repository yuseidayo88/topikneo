import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNetInfo } from '../hooks/useNetInfo';
import { typographyScale } from '../theme';
import { getCommonStrings } from '../i18n/common';
import { useProfileStore } from '../store/profileStore';

/**
 * オフライン時に画面上部に表示するバナー。ThemeProvider の子で使用すること。
 */
export function OfflineBanner() {
  const isConnected = useNetInfo();
  const { resolvedMode } = useTheme();
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const t = React.useMemo(
    () => getCommonStrings(displayLanguage),
    [displayLanguage]
  );
  const isDark = resolvedMode === 'dark';
  const bg = isDark ? 'rgba(239,68,68,0.95)' : '#DC2626';
  const textColor = '#FFF';

  if (isConnected !== false) return null;

  return (
    <View style={[styles.banner, { backgroundColor: bg }]} accessibilityRole="alert" accessibilityLabel={t.offlineBanner}>
      <Ionicons name="cloud-offline" size={18} color={textColor} style={styles.icon} />
      <Text style={[styles.text, { color: textColor }]}>{t.offlineBanner}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  icon: { marginRight: 8 },
  text: { ...typographyScale.bodySmall, fontWeight: '600' },
});
