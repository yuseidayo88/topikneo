import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { getContentColumnWidth, PAD } from '@/src/theme/settingsFlowTokens';

/**
 * 回転・Split View に追従するメインコンテンツ列幅（タブレットで広げる）
 */
export function useContentColumnWidth(horizontalPad: number = PAD): number {
  const { width } = useWindowDimensions();
  return useMemo(() => getContentColumnWidth(width, horizontalPad), [width, horizontalPad]);
}
