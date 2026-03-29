import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** タブバー高さ（コンテンツ56 + 下端セーフエリア）※コンテンツの paddingBottom 用 */
const TAB_BAR_HEIGHT = 56;

export function useSafeArea() {
  const insets = useSafeAreaInsets();
  const tabBarTotalHeight = TAB_BAR_HEIGHT + insets.bottom;
  return {
    top: insets.top,
    bottom: insets.bottom,
    headerPaddingTop: Math.max(12, insets.top + 8),
    footerPaddingBottom: Math.max(20, insets.bottom + 16),
    tabBarPaddingBottom: tabBarTotalHeight,
  };
}
