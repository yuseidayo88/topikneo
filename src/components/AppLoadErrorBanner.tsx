import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNetInfo } from '../hooks/useNetInfo';
import { useWordsStore } from '../store/wordsStore';
import { useGrammarStore } from '../store/grammarStore';
import { typographyScale } from '../theme';
import { getCommonStrings } from '../i18n/common';
import { useProfileStore } from '../store/profileStore';

/**
 * 起動時の単語・文法 load 失敗時に画面上部に表示するバナー。再試行ボタンで両方再取得する。
 */
export function AppLoadErrorBanner() {
  const wordsLoadError = useWordsStore((s) => s.wordsLoadError);
  const grammarLoadError = useGrammarStore((s) => s.grammarLoadError);
  const wordsLoading = useWordsStore((s) => s.wordsLoading);
  const grammarLoading = useGrammarStore((s) => s.grammarLoading);
  const loadWords = useWordsStore((s) => s.loadWordsFromSupabase);
  const loadGrammar = useGrammarStore((s) => s.loadGrammarFromSupabase);
  const isConnected = useNetInfo();
  const { resolvedMode } = useTheme();
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const t = React.useMemo(
    () => getCommonStrings(displayLanguage),
    [displayLanguage]
  );

  const hasError = Boolean(wordsLoadError || grammarLoadError);
  const loading = wordsLoading || grammarLoading;
  const [retrying, setRetrying] = React.useState(false);

  const onRetry = React.useCallback(async () => {
    setRetrying(true);
    try {
      await Promise.all([loadWords(), loadGrammar()]);
    } finally {
      setRetrying(false);
    }
  }, [loadWords, loadGrammar]);

  if (!hasError || loading) return null;

  const isDark = resolvedMode === 'dark';
  const bg = isDark ? 'rgba(239,68,68,0.95)' : '#DC2626';
  const textColor = '#FFF';
  const topOffset = isConnected === false ? 44 : 0;

  return (
    <View
      style={[styles.banner, { backgroundColor: bg, top: topOffset }]}
      accessibilityRole="alert"
      accessibilityLabel={`${t.loadErrorBannerMessage} ${t.retry}`}
    >
      <Ionicons name="alert-circle-outline" size={18} color={textColor} style={styles.icon} />
      <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
        {t.loadErrorBannerMessage}
      </Text>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}
        onPress={onRetry}
        disabled={retrying}
        accessibilityLabel={t.retry}
        accessibilityRole="button"
      >
        <Text style={styles.btnText}>{t.retry}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9998,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  icon: { marginRight: 8 },
  text: { ...typographyScale.bodySmall, fontWeight: '600', flex: 1 },
  btn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.25)' },
  btnText: { ...typographyScale.bodySmall, fontWeight: '600', color: '#FFF' },
});
