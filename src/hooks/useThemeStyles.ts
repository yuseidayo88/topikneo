import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  getTypography,
  getCardShadow,
  getCardShadowSubtle,
  getCardBorder,
  type Colors,
} from '../theme';
import { getSettingsFlowShadow } from '../theme/settingsFlowTokens';

type ThemeStyles = {
  colors: Colors;
  typography: ReturnType<typeof getTypography>;
  cardShadow: ReturnType<typeof getCardShadow>;
  cardShadowSubtle: ReturnType<typeof getCardShadowSubtle>;
  cardBorder: ReturnType<typeof getCardBorder>;
  /** 設定フロー・ホーム等で使うシャドウ（getSettingsFlowShadow） */
  flowShadow: ReturnType<typeof getSettingsFlowShadow>;
};

/**
 * テーマに依存する typography / cardShadow / cardBorder / flowShadow をまとめて返す。
 * 各画面での useMemo 重複を減らし、useTheme() と getTypography/getCardShadow/getSettingsFlowShadow の組み合わせを1本化する。
 */
export function useThemeStyles(): ThemeStyles {
  const { colors, resolvedMode } = useTheme();
  const typography = useMemo(() => getTypography(colors), [colors]);
  const cardShadow = useMemo(() => getCardShadow(resolvedMode), [resolvedMode]);
  const cardShadowSubtle = useMemo(() => getCardShadowSubtle(resolvedMode), [resolvedMode]);
  const cardBorder = useMemo(() => getCardBorder(resolvedMode), [resolvedMode]);
  const flowShadow = useMemo(() => getSettingsFlowShadow(resolvedMode), [resolvedMode]);
  return useMemo(
    () => ({ colors, typography, cardShadow, cardShadowSubtle, cardBorder, flowShadow }),
    [colors, typography, cardShadow, cardShadowSubtle, cardBorder, flowShadow]
  );
}
