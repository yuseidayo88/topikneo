import { StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { hexToRgba } from '../theme';

/** Stack の headerBackground 用。ライトは薄い水色、ダークはカード色 */
export function GlassHeaderBackground() {
  const { colors, resolvedMode } = useTheme();
  const bg = resolvedMode === 'dark' ? colors.card : hexToRgba(colors.primary, 0.06);
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} />;
}
