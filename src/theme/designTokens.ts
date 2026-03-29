/**
 * デザイントークンの共通参照用。
 * - レイアウト・余白: settingsFlowTokens の PAD, GAP, CONTENT_W, MIN_TOUCH, RADIUS
 * - タイポ・余白スケール: theme の spacing, radius, typographyScale
 * 新規画面ではこのファイルから import すると一貫性を保ちやすい。
 */
export {
  PAD,
  GAP,
  CONTENT_W,
  MIN_TOUCH,
  RADIUS,
  getSettingsFlowTokens,
  getSettingsFlowShadow,
  type SettingsFlowToken,
  type ShadowToken,
} from './settingsFlowTokens';

export { spacing, radius, typographyScale } from '../theme';
