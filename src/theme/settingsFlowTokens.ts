import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const PAD = 24;
export const GAP = 24;
export const MIN_TOUCH = 44;

/** この幅以上をタブレット（コンテンツ列を広げる）として扱う（iPad mini 縦 744pt などを含む） */
export const TABLET_LAYOUT_MIN_WIDTH = 700;

/** スマホ相当のコンテンツ最大幅 */
export const CONTENT_W_PHONE_MAX = 460;

/**
 * 12.9" iPad Pro 縦向きなど。読みすぎないよう上限を付与
 * @see https://developer.apple.com/design/human-interface-guidelines/layout
 */
export const CONTENT_W_TABLET_MAX = 900;

/**
 * 画面幅に応じたメインコンテンツ列の幅（ホーム・設定・各タブで統一）
 */
export function getContentColumnWidth(screenWidth: number, horizontalPad: number = PAD): number {
  const inner = Math.max(0, screenWidth - horizontalPad * 2);
  const cap = screenWidth >= TABLET_LAYOUT_MIN_WIDTH ? CONTENT_W_TABLET_MAX : CONTENT_W_PHONE_MAX;
  return Math.min(cap, inner);
}

/** モジュール初期化時の列幅（フック未使用の画面向け・回転は反映されない） */
export const CONTENT_W = getContentColumnWidth(SCREEN_WIDTH, PAD);

export type SettingsFlowToken = {
  bg: string;
  bgEnd: string;
  surface: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  accent: string;
  /** アクセント色のテキスト用。ライトでは accent と同じ、ダークでは背景で見やすい明るい青 */
  accentText: string;
  accentSoft: string;
  grammar: string;
  grammarSoft: string;
  /** 目標達成・成功表示用 */
  success: string;
  border: string;
  divider: string;
  /** プログレスバーのトラック背景 */
  progressTrackBg: string;
  /** カレンダーセル等の薄い背景 */
  cellBg: string;
  danger: string;
  dangerSoft: string;
  buttonBlack: string;
};

const TOKEN_LIGHT: SettingsFlowToken = {
  bg: '#F5F5F4',
  bgEnd: '#EFEFEE',
  surface: '#FAFAF9',
  ink: '#1A1A1A',
  inkMuted: '#6B7280',
  inkFaint: '#9CA3AF',
  accent: '#1E40AF',
  accentText: '#1E40AF',
  accentSoft: 'rgba(30,64,175,0.12)',
  grammar: '#047857',
  grammarSoft: 'rgba(4,120,87,0.12)',
  success: '#059669',
  border: 'rgba(0,0,0,0.06)',
  divider: 'rgba(0,0,0,0.08)',
  progressTrackBg: 'rgba(0,0,0,0.06)',
  cellBg: 'rgba(0,0,0,0.05)',
  danger: '#DC2626',
  dangerSoft: 'rgba(220,38,38,0.12)',
  buttonBlack: '#1A1A1A',
};

/** ダーク：背景・インクは暗く、アクセント青は暗背景で視認しやすい明るめに */
const TOKEN_DARK: SettingsFlowToken = {
  bg: '#1e1e1e',
  bgEnd: '#252526',
  surface: '#2d2d2d',
  ink: '#cccccc',
  inkMuted: '#858585',
  inkFaint: '#6e6e6e',
  accent: '#3B82F6',
  accentText: '#93C5FD',
  accentSoft: 'rgba(96,165,250,0.22)',
  grammar: '#047857',
  grammarSoft: 'rgba(4,120,87,0.2)',
  success: '#059669',
  border: '#3c3c3c',
  divider: 'rgba(255,255,255,0.08)',
  progressTrackBg: 'rgba(255,255,255,0.08)',
  cellBg: 'rgba(255,255,255,0.06)',
  danger: '#DC2626',
  dangerSoft: 'rgba(220,38,38,0.2)',
  buttonBlack: '#cccccc',
};

export function getSettingsFlowTokens(mode: 'light' | 'dark'): SettingsFlowToken {
  return mode === 'dark' ? TOKEN_DARK : TOKEN_LIGHT;
}

export const RADIUS = { card: 24, pill: 999, button: 14, option: 12 } as const;

export type ShadowToken = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

/** コンテンツカード用：狭い範囲で濃いドロップシャドウ（浮いて見える）。ホーム・設定・単語・文法など全画面で統一 */
export const SHADOW_LIGHT: ShadowToken = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.14,
  shadowRadius: 14,
  elevation: 4,
};

export const SHADOW_DARK: ShadowToken = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.28,
  shadowRadius: 14,
  elevation: 5,
};

export function getSettingsFlowShadow(mode: 'light' | 'dark'): ShadowToken {
  return mode === 'dark' ? SHADOW_DARK : SHADOW_LIGHT;
}
