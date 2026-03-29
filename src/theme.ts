/**
 * デザイントークン（参考画像ベース・ガラスモーフィズム・グラデーション背景）
 * 機能はそのまま、見た目のみ統一
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export type Colors = {
  primary: string;
  primaryEnd: string;
  /** 文法用・落ち着いた緑 */
  grammarPrimary: string;
  grammarPrimaryEnd: string;
  accent: string;
  correct: string;
  wrong: string;
  streak: string;
  background: string;
  card: string;
  /** タブバー・ヘッダー・入力欄上などの表面 */
  surface: string;
  /** 入力フィールド背景 */
  inputBg: string;
  /** チャット・相手の吹き出し背景 */
  chatBubbleOther: string;
  /** アクセントの薄い背景（ボタン・バッジ等） */
  accentSoft: string;
  text: string;
  textSecondary: string;
  border: string;
  onPrimary: string;
  shadow: string;
  /** 危険・削除等 */
  danger?: string;
  /** 文法レッスンカード上のタイトル・スピーカー用（ライト・ダーク共通で grammarPrimary と揃える） */
  grammarOnCard: string;
  /** カード内セクションラベル（意味・例文など） */
  textMutedOnCard: string;
  /** 例文の訳・補足（カード上で一段明るく） */
  translationMutedOnCard: string;
};

/** 保存星アイコン用（青系テーマに合う黄） */
export const SAVED_STAR_YELLOW = '#EAB308';

/** 目に優しいオフホワイト（真っ白 #FFF の代わりに使用） */
export const SOFT_WHITE = '#FAFAF9';
/** 目に優しい背景（やや温かみの薄いグレー） */
export const SOFT_BG = '#F5F5F4';
export const SOFT_BG_END = '#EFEFEE';

/** 単語＝青・文法＝緑。勉強に適した落ち着いた色（目に優しいトーン） */
export const colorsLight: Colors = {
  primary: '#1E40AF',
  primaryEnd: '#3B82F6',
  grammarPrimary: '#047857',
  grammarPrimaryEnd: '#059669',
  accent: '#1E40AF',
  correct: '#22C55E',
  wrong: '#EF4444',
  streak: '#38BDF8',
  background: '#F5F5F4',
  card: SOFT_WHITE,
  surface: SOFT_WHITE,
  inputBg: '#F0F0F0',
  chatBubbleOther: '#E5E5EA',
  accentSoft: 'rgba(30,64,175,0.12)',
  text: '#374151',
  textSecondary: '#6B7280',
  border: 'rgba(0,0,0,0.06)',
  onPrimary: '#FFFFFF',
  shadow: '#000',
  danger: '#DC2626',
  grammarOnCard: '#047857',
  textMutedOnCard: '#6B7280',
  translationMutedOnCard: '#6B7280',
};

/**
 * ダーク：背景は暗く、アクセントは暗背景上で視認しやすい明るめの色にする。
 * （ライトと同じ #1E40AF だと境界・小さなアイコン・細い線が見えにくい）
 */
export const colorsDark: Colors = {
  primary: '#3B82F6',
  primaryEnd: '#60A5FA',
  grammarPrimary: '#047857',
  grammarPrimaryEnd: '#059669',
  accent: '#60A5FA',
  correct: '#22C55E',
  wrong: '#EF4444',
  streak: '#38BDF8',
  background: '#1e1e1e',
  card: '#2d2d2d',
  surface: '#2d2d2d',
  inputBg: '#3c3c3c',
  chatBubbleOther: '#333333',
  accentSoft: 'rgba(96,165,250,0.22)',
  text: '#cccccc',
  textSecondary: '#858585',
  border: '#3c3c3c',
  onPrimary: '#FFFFFF',
  shadow: '#000',
  danger: '#DC2626',
  grammarOnCard: '#047857',
  textMutedOnCard: '#A8A8A8',
  translationMutedOnCard: '#C8C8C8',
};

export const colors = colorsLight;

export function getColors(mode: 'light' | 'dark'): Colors {
  return mode === 'dark' ? colorsDark : colorsLight;
}

function safeMode(mode: 'light' | 'dark' | null | undefined): 'light' | 'dark' {
  return mode === 'dark' ? 'dark' : 'light';
}

/** 画面背景グラデーション（上→下）。ダークは Cursor 風 #1e1e1e → #252526 */
export function getScreenGradientColors(mode: 'light' | 'dark' | null | undefined): readonly [string, string, string] {
  return safeMode(mode) === 'dark'
    ? ['#1e1e1e', '#252526', '#2d2d2d']
    : ['#0369A1', '#0EA5E9', '#BAE6FD'];
}

/** グラスモーフィズム背景。ダークは Cursor 風サーフェス */
export function getGlassCardBackground(mode: 'light' | 'dark' | null | undefined): string {
  return safeMode(mode) === 'dark'
    ? '#2d2d2d'
    : 'rgba(250,250,249,0.96)';
}

/** ガラスボックスの縁。ダークは Cursor 風ボーダー */
export function getGlassCardBorder(mode: 'light' | 'dark' | null | undefined) {
  return safeMode(mode) === 'dark'
    ? { borderWidth: 1, borderColor: '#3c3c3c' }
    : { borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' };
}

/** コンテンツカード用：狭い範囲で濃いドロップシャドウ（浮いて見える）。settingsFlowTokens の SHADOW と統一 */
export function getGlassCardShadow(mode: 'light' | 'dark' | null | undefined) {
  return safeMode(mode) === 'dark'
    ? { shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 5 }
    : { shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 14, elevation: 4 };
}

/** Image 0: カード角丸 24（非常に大きく） */
export const CARD_RADIUS = 24;
export const GLASS_CARD_OPACITY = 0.78;
export const GLASS_RADIUS = CARD_RADIUS;

export function getCardBorder(mode: 'light' | 'dark' | null | undefined) {
  return getGlassCardBorder(mode);
}

export function getCardShadowSubtle(mode: 'light' | 'dark' | null | undefined) {
  return getGlassCardShadow(mode);
}

export function getGlassCardStyle(colors: Colors, mode: 'light' | 'dark' | null | undefined) {
  return {
    backgroundColor: getGlassCardBackground(mode),
    ...getGlassCardBorder(mode),
    ...getGlassCardShadow(mode),
  };
}

export function hexToRgba(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r},${g},${b},${opacity})`;
}

/** Image 0: たっぷり余白（padding/margin） */
export const spacing = {
  xs: 6,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  xxl: 44,
  /** カード内パディング */
  card: 24,
  /** セクション間の縦余白 */
  section: 28,
} as const;

/** 参考画像に合わせた角丸：カードはすべて 20px で統一 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  xxl: CARD_RADIUS,
  glass: CARD_RADIUS,
} as const;

export const PRESS_SCALE = 0.98;

/**
 * 動的タイプ（アクセシビリティの文字サイズ）の上限。
 * UI 崩れを抑えつつ拡大を許可する。
 */
export const FONT_SCALE_MAX = 1.35;

/**
 * 全画面統一のタイポグラフィスケール（サイズ・ウェイトのみ）。
 * 設定系・学習系どちらでもこの数値を参照すること。
 */
export const typographyScale = {
  /** 画面タイトル・ヘッダー・セクション見出し */
  header: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24 },
  /** 大見出し（オンボ等） */
  title: { fontSize: 26, fontWeight: '700' as const, lineHeight: 34, letterSpacing: -0.3 },
  /** セクション見出し（header と同じ） */
  section: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24 },
  /** 本文 */
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  /** リストラベル・カードラベル等 */
  bodyMedium: { fontSize: 16, fontWeight: '500' as const, lineHeight: 24 },
  bodyLarge: { fontSize: 17, fontWeight: '400' as const, lineHeight: 26 },
  /** 補足・小さめ本文 */
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  /** キャプション・注釈 */
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  /** ボタンラベル */
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  /** 韓国語表示用 */
  korean: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  /** バッジ・タグ等小さめ */
  badge: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
  /** 数値・スコア等強調 */
  score: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26 },
} as const;

const typographyBase = { ...typographyScale };

export function getTypography(colors: Colors) {
  return {
    header: { ...typographyBase.header, color: colors.text },
    title: { ...typographyBase.title, color: colors.text },
    section: { ...typographyBase.section, color: colors.text },
    body: { ...typographyBase.body, color: colors.text },
    bodyMedium: { ...typographyBase.bodyMedium, color: colors.text },
    bodyLarge: { ...typographyBase.bodyLarge, color: colors.text },
    bodySmall: { ...typographyBase.bodySmall, color: colors.textSecondary },
    caption: { ...typographyBase.caption, color: colors.textSecondary },
    button: { ...typographyBase.button, color: colors.text },
    korean: { ...typographyBase.korean, color: colors.text },
    badge: { ...typographyBase.badge, color: colors.textSecondary },
    score: { ...typographyBase.score, color: colors.text },
  };
}

export const typography = {
  ...typographyBase,
  header: { ...typographyBase.header, color: colorsLight.text },
  title: { ...typographyBase.title, color: colorsLight.text },
  section: { ...typographyBase.section, color: colorsLight.text },
  body: { ...typographyBase.body, color: colorsLight.text },
  bodyMedium: { ...typographyBase.bodyMedium, color: colorsLight.text },
  bodyLarge: { ...typographyBase.bodyLarge, color: colorsLight.text },
  bodySmall: { ...typographyBase.bodySmall, color: colorsLight.textSecondary },
  caption: { ...typographyBase.caption, color: colorsLight.textSecondary },
  button: { ...typographyBase.button, color: colorsLight.text },
  korean: { ...typographyBase.korean, color: colorsLight.text },
  badge: { ...typographyBase.badge, color: colorsLight.textSecondary },
  score: { ...typographyBase.score, color: colorsLight.text },
};

export function getCardShadow(mode: 'light' | 'dark' | null | undefined) {
  return getGlassCardShadow(mode);
}

/** コンテンツカード用：狭い範囲で濃いドロップシャドウ（getGlassCardShadow と同値・ライト想定） */
export const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.14,
  shadowRadius: 14,
  elevation: 4,
} as const;
