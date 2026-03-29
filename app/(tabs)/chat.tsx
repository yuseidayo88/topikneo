/**
 * チャット画面（ゼロから構築・Instagram/LINE 風）
 * - データ層: src/supabase/chat.ts のみ利用
 * - ヘッダー: 他タブと統一（プロフィール・タイトル・設定）
 * - メッセージ: 下に最新。入力欄は常に画面下固定。キーボードで上に押し上げ。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
  Alert,
  RefreshControl,
  Keyboard,
  Platform,
  Animated,
  PanResponder,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { TabHeader } from '@/src/components/TabHeader';
import { triggerLightImpact } from '@/src/utils/haptics';
import type { Colors } from '@/src/theme';
import { typographyScale } from '@/src/theme';
import {
  listChatRooms,
  fetchMessagesLatest,
  fetchMessagesOlderThan,
  sendMessage,
  subscribeMessages,
  getCurrentSenderId,
  getChatModerationStatus,
  agreeChatTerms,
  reportMessage,
  blockUser,
  unblockUser,
  filterBlockedMessages,
  DEFAULT_ROOM_NAME,
  type ChatReportReason,
  type ChatMessage,
  type ChatRoom,
} from '@/src/supabase/chat';
import { isSupabaseConfigured } from '@/src/supabase/client';
import { useProfileStore } from '@/src/store/profileStore';
import type { AppLocale } from '@/src/i18n/appLocale';
import { APP_LOCALE_BCP47 } from '@/src/i18n/appLocale';
import { getChatTabStrings } from '@/src/i18n/appScreens';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSubscriptionStore } from '@/src/store/subscriptionStore';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { useAuthStore } from '@/src/store/authStore';
import { getCachedChatMessages, setCachedChatMessages } from '@/src/utils/chatMessagesCache';
import { TABLET_LAYOUT_MIN_WIDTH } from '@/src/theme/settingsFlowTokens';
import { useContentColumnWidth } from '@/src/hooks/useContentColumnWidth';
import * as WebBrowser from 'expo-web-browser';
import { TERMS_URL } from '@/src/constants/legal';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAD = 24;
const MIN_TOUCH = 44;
/** 初回取得を軽くして体感を速くする（過去はスクロールで追加読込） */
const MESSAGES_PAGE_SIZE = 15;
// 「下端からこれ以上離れたら」最新へ戻るボタンを表示
// 数値が小さいほど“少し遡った時点”で表示されやすい
const SCROLL_TO_BOTTOM_SHOW_OFFSET = 50;
const CHAT_TERMS_VERSION = '2026-03-26';
// App Review 用: 既存ユーザーでもチャット入室時に規約同意モーダルを表示する
const ALWAYS_SHOW_TERMS_GATE = true;
const CHAT_SELECTED_ROOM_KEY = 'kla_chat_selected_room_v1';

type GroupPos = 'single' | 'first' | 'middle' | 'last';

type ListItem =
  | { type: 'date'; key: string; label: string }
  | { type: 'msg'; key: string; message: ChatMessage; group: GroupPos };

function dateLabelForLocale(d: string, todayLabel: string, yesterdayLabel: string, locale: AppLocale): string {
  const dt = new Date(d + 'T12:00:00Z');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dt.toDateString() === today.toDateString()) return todayLabel;
  if (dt.toDateString() === yesterday.toDateString()) return yesterdayLabel;
  return dt.toLocaleDateString(APP_LOCALE_BCP47[locale] ?? 'en-US', { month: 'numeric', day: 'numeric' });
}

function timeStr(createdAt: string, locale: AppLocale): string {
  return new Date(createdAt).toLocaleTimeString(APP_LOCALE_BCP47[locale] ?? 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function buildList(messages: ChatMessage[], getDateLabel: (d: string) => string): ListItem[] {
  const out: ListItem[] = [];
  let lastDate = '';
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const d = m.created_at.slice(0, 10);
    if (d !== lastDate) {
      lastDate = d;
      out.push({ type: 'date', key: `d-${d}`, label: getDateLabel(d) });
    }
    const prevSame = i > 0 && messages[i - 1].sender_id === m.sender_id;
    const nextSame = i < messages.length - 1 && messages[i + 1].sender_id === m.sender_id;
    const group: GroupPos = prevSame && nextSame ? 'middle' : prevSame ? 'last' : nextSame ? 'first' : 'single';
    out.push({ type: 'msg', key: m.id, message: m, group });
  }
  return out;
}

function dedupeMessagesById(messages: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  const out: ChatMessage[] = [];
  for (const msg of messages) {
    if (seen.has(msg.id)) continue;
    seen.add(msg.id);
    out.push(msg);
  }
  return out;
}

function avatarColor(id: string): string {
  const hues = ['#4F7CFF', '#0D9488', '#6366F1', '#E11D48', '#F59E0B'];
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return hues[n % hues.length];
}

const RADIUS = 18;

function bubbleStyleMe(colors: Colors, group: GroupPos, maxW: number): object {
  const base = { maxWidth: maxW, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.accent };
  if (group === 'single') {
    return { ...base, borderRadius: RADIUS };
  }
  if (group === 'first') {
    return { ...base, borderTopLeftRadius: RADIUS, borderTopRightRadius: RADIUS, borderBottomLeftRadius: RADIUS, borderBottomRightRadius: RADIUS };
  }
  if (group === 'middle') {
    return { ...base, borderRadius: RADIUS };
  }
  return { ...base, borderTopLeftRadius: RADIUS, borderTopRightRadius: RADIUS, borderBottomLeftRadius: RADIUS, borderBottomRightRadius: RADIUS };
}

function bubbleStyleOther(colors: Colors, group: GroupPos, maxW: number): object {
  const base = { maxWidth: maxW, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.chatBubbleOther };
  if (group === 'single') {
    return { ...base, borderRadius: RADIUS };
  }
  if (group === 'first') {
    return { ...base, borderTopLeftRadius: RADIUS, borderTopRightRadius: RADIUS, borderBottomLeftRadius: RADIUS, borderBottomRightRadius: RADIUS };
  }
  if (group === 'middle') {
    return { ...base, borderRadius: RADIUS };
  }
  return { ...base, borderTopLeftRadius: RADIUS, borderTopRightRadius: RADIUS, borderBottomLeftRadius: RADIUS, borderBottomRightRadius: RADIUS };
}

function rowMarginBottom(group: GroupPos): number {
  return group === 'last' || group === 'single' ? 8 : 2;
}

function ChatListSkeleton({ styles }: { styles: { listContent: object; skeletonRow: object; skeletonBubbleMe: object; skeletonBubbleOther: object } }) {
  return (
    <View style={styles.listContent}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            styles.skeletonRow,
            { justifyContent: i % 2 === 0 ? ('flex-end' as const) : ('flex-start' as const) },
          ]}
        >
          <View style={i % 2 === 0 ? styles.skeletonBubbleMe : styles.skeletonBubbleOther} />
        </View>
      ))}
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { colors, resolvedMode } = useTheme();
  const { flowShadow: headerShadow } = useThemeStyles();
  const keyboardAppearance = resolvedMode === 'dark' ? 'dark' : 'light';
  const { headerPaddingTop, tabBarPaddingBottom } = useSafeArea();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const contentW = useContentColumnWidth(PAD);
  const bubbleMaxW = useMemo(
    () => Math.min(windowWidth * 0.72, windowWidth >= TABLET_LAYOUT_MIN_WIDTH ? 560 : 300),
    [windowWidth]
  );

  const gradientColors = useMemo<[string, string]>(() => [colors.background, colors.surface], [colors.background, colors.surface]);
  const headerTheme = useMemo(
    () => ({
      headerBg: colors.background,
      headerBorderColor: colors.border,
      avatarBg: colors.accentSoft,
      avatarBorderColor: 'rgba(30,64,175,0.35)',
      avatarIconColor: colors.accent,
      titleColor: colors.text,
      subtitleColor: colors.textSecondary,
      settingsCircleBg: colors.surface,
      settingsCircleBorder: colors.border,
      settingsIconColor: colors.textSecondary,
    }),
    [colors, resolvedMode]
  );

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: PAD },
        hint: { ...typographyScale.body, color: colors.textSecondary, textAlign: 'center' },
        retryBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: colors.accent },
        retryText: { ...typographyScale.button, color: colors.onPrimary },
        headerFixed: {
          paddingHorizontal: PAD,
          alignItems: 'center',
          backgroundColor: colors.background,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14 },
        headerBtn: { minHeight: MIN_TOUCH, justifyContent: 'center' },
        headerAvatar: {
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: 'rgba(30,64,175,0.35)',
          ...headerShadow,
        },
        headerCenter: { flex: 1, marginHorizontal: 14, alignItems: 'flex-start', justifyContent: 'center' },
        headerSettingsCircle: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.border,
          ...headerShadow,
        },
        headerTitle: { ...typographyScale.header, color: colors.text, marginBottom: 2 },
        headerSub: { ...typographyScale.caption, color: colors.textSecondary },
        realtimeBanner: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 10,
          paddingHorizontal: 12,
          backgroundColor: colors.danger ?? '#B91C1C',
        },
        realtimeBannerText: { ...typographyScale.bodySmall, fontWeight: '600', color: colors.onPrimary },
        roomPickerRow: {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
          maxHeight: 52,
        },
        roomPickerScroll: { paddingHorizontal: 12, paddingVertical: 8, flexGrow: 0 },
        roomChip: {
          marginRight: 8,
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.inputBg,
          maxWidth: 220,
        },
        roomChipActive: { borderColor: colors.accent, backgroundColor: colors.accent },
        roomChipText: { ...typographyScale.bodySmall, fontWeight: '600', color: colors.text },
        roomChipTextActive: { color: colors.onPrimary },
        body: { flex: 1 },
        listContent: { paddingHorizontal: 12, paddingTop: 12 },
        empty: { ...typographyScale.bodySmall, color: colors.textSecondary, textAlign: 'center', marginTop: PAD },
        olderLoader: { paddingVertical: 12, alignItems: 'center' },
        dateWrap: { alignItems: 'center', marginVertical: 12 },
        dateText: { ...typographyScale.badge, color: colors.textSecondary },
        rowMe: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', marginBottom: 8, paddingHorizontal: 0 },
        timeText: { ...typographyScale.caption, color: colors.textSecondary, marginRight: 6 },
        bubbleMe: { maxWidth: bubbleMaxW, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.accent },
        bubbleText: { ...typographyScale.body, color: colors.onPrimary, lineHeight: 20 },
        rowOther: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, paddingHorizontal: 0 },
        avatarWrap: { marginTop: 18, marginRight: 8 },
        avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
        avatarPlaceholder: { width: 32, height: 32, marginRight: 8 },
        avatarText: { ...typographyScale.badge, color: colors.onPrimary },
        bodyOther: { maxWidth: bubbleMaxW, alignSelf: 'flex-start', flex: 0 },
        nameText: { ...typographyScale.badge, color: colors.textSecondary, marginBottom: 2, marginLeft: 4 },
        bubbleWithTimeRow: { flexDirection: 'row', alignItems: 'flex-end' },
        bubbleTextDark: { ...typographyScale.body, color: colors.text, lineHeight: 20 },
        replyQuoteMe: { borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.7)', paddingLeft: 8, marginBottom: 6 },
        replyQuoteOther: { borderLeftWidth: 2, borderLeftColor: colors.accent, paddingLeft: 8, marginBottom: 6 },
        replyQuoteNameMe: { ...typographyScale.caption, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
        replyQuoteNameOther: { ...typographyScale.caption, color: colors.accent, fontWeight: '700' },
        replyQuoteTextMe: { ...typographyScale.caption, color: 'rgba(255,255,255,0.9)' },
        replyQuoteTextOther: { ...typographyScale.caption, color: colors.textSecondary },
        timeTextOther: { ...typographyScale.caption, color: colors.textSecondary, marginLeft: 4 },
        scrollToBottomBtn: {
          position: 'absolute',
          right: 16,
          bottom: 62,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.accent,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.28,
          shadowRadius: 8,
          elevation: 6,
        },
        inputWrap: {
          paddingHorizontal: 12,
          paddingTop: 8,
          backgroundColor: colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        },
        replyComposerBox: {
          marginBottom: 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.inputBg,
          paddingVertical: 8,
          paddingHorizontal: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        },
        replyComposerMain: { flex: 1, gap: 2 },
        replyComposerLabel: { ...typographyScale.caption, color: colors.accent, fontWeight: '700' },
        replyComposerText: { ...typographyScale.caption, color: colors.textSecondary },
        replyComposerClose: { padding: 4 },
        inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
        input: {
          flex: 1,
          minHeight: 44,
          maxHeight: 100,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 22,
          backgroundColor: colors.inputBg,
          ...typographyScale.body,
          color: colors.text,
        },
        sendBtn: { height: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
        sendBtnDisabled: { opacity: 0.5 },
        modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: PAD },
        modalBox: { width: '100%', maxWidth: 320, borderRadius: 16, padding: PAD, backgroundColor: colors.surface, ...headerShadow },
        modalTitle: { ...typographyScale.header, color: colors.text, marginBottom: 12 },
        modalInput: {
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          ...typographyScale.body,
          backgroundColor: colors.inputBg,
          color: colors.text,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: colors.border,
        },
        modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
        modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
        modalCancel: { borderWidth: 1, borderColor: colors.border },
        modalOk: { backgroundColor: colors.accent },
        modalCancelText: { ...typographyScale.button, color: colors.text },
        modalOkText: { ...typographyScale.button, color: colors.onPrimary },
        chatProOnlyWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16 },
        chatProOnlyText: { ...typographyScale.bodySmall, color: colors.textSecondary },
        chatProOnlyBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.accent },
        chatProOnlyBtnText: { ...typographyScale.bodySmall, fontWeight: '600', color: colors.onPrimary },
        skeletonRow: { flexDirection: 'row' as const, marginBottom: 14, paddingHorizontal: 4 },
        skeletonBubbleMe: {
          alignSelf: 'flex-end' as const,
          width: '72%' as const,
          maxWidth: Math.min(bubbleMaxW + 20, 520),
          height: 46,
          borderRadius: 18,
          backgroundColor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
        skeletonBubbleOther: {
          alignSelf: 'flex-start' as const,
          width: '78%' as const,
          maxWidth: Math.min(bubbleMaxW + 40, 560),
          height: 52,
          borderRadius: 18,
          backgroundColor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
        },
        listLoadingHint: { ...typographyScale.caption, color: colors.textSecondary, textAlign: 'center', paddingVertical: 8 },
        contextMenuBackdrop: { flex: 1 },
        contextMenuBlur: { ...StyleSheet.absoluteFillObject },
        contextMenuDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,10,18,0.28)' },
        contextMenuBubbleWrap: { position: 'absolute' },
        contextMenuBox: {
          position: 'absolute',
          minWidth: 148,
          maxWidth: 220,
          borderRadius: 12,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          ...headerShadow,
        },
        contextMenuItem: {
          paddingVertical: 10,
          paddingHorizontal: 14,
        },
        contextMenuItemDanger: {
          backgroundColor: resolvedMode === 'dark' ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
        },
        contextMenuItemText: {
          ...typographyScale.bodySmall,
          color: colors.text,
        },
        contextMenuItemDangerText: {
          ...typographyScale.bodySmall,
          color: colors.danger ?? '#DC2626',
        },
        contextMenuDivider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
        },
        reasonSheetBackdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'flex-end',
        },
        reasonSheetCard: {
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: colors.border,
          paddingTop: 8,
          paddingBottom: Math.max(tabBarPaddingBottom, 4),
        },
        reasonSheetHandle: {
          alignSelf: 'center',
          width: 42,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          marginBottom: 10,
        },
        reasonSheetTitle: {
          ...typographyScale.section,
          color: colors.text,
          textAlign: 'center',
          marginBottom: 8,
          paddingHorizontal: 16,
        },
        reasonSheetItem: {
          paddingHorizontal: 16,
          paddingVertical: 14,
        },
        reasonSheetItemSelected: {
          backgroundColor: colors.accentSoft,
        },
        reasonSheetItemText: {
          ...typographyScale.body,
          color: colors.text,
        },
        reasonSheetDivider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginLeft: 16,
        },
        reasonSheetCancel: {
          marginTop: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
        },
        reasonSheetCancelText: {
          ...typographyScale.button,
          color: colors.textSecondary,
          textAlign: 'center',
        },
        reasonSheetSubmitText: {
          ...typographyScale.button,
          color: colors.onPrimary,
          textAlign: 'center',
          fontWeight: '700',
        },
        reasonSheetSubmitBtn: {
          backgroundColor: colors.danger ?? '#DC2626',
          borderRadius: 999,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
          minHeight: 44,
          justifyContent: 'center',
        },
        safetyModalBackdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: PAD,
        },
        safetyModalBox: {
          width: '100%',
          maxWidth: 420,
          borderRadius: 16,
          padding: PAD,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        safetyTitle: { ...typographyScale.section, color: colors.text, marginBottom: 10 },
        safetyBody: { ...typographyScale.bodySmall, color: colors.textSecondary, lineHeight: 20, marginBottom: 14 },
        safetyCheckRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
        safetyCheckBox: {
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        },
        safetyCheckText: { ...typographyScale.bodySmall, color: colors.text, flex: 1, lineHeight: 20 },
        safetyActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
        safetyLinkWrap: { marginBottom: 14 },
        safetyLinkText: { ...typographyScale.caption, color: colors.accent, textDecorationLine: 'underline' },
        safetyBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
        safetyBtnGhost: { borderWidth: 1, borderColor: colors.border },
        safetyBtnPrimary: { backgroundColor: colors.accent },
        safetyBtnGhostText: { ...typographyScale.button, color: colors.text },
        safetyBtnPrimaryText: { ...typographyScale.button, color: colors.onPrimary },
      }),
      [colors, resolvedMode, headerShadow, bubbleMaxW]
  );

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [senderId, setSenderId] = useState<string | null>(null);
  const profileName = useProfileStore((s) => s.name);
  const loadProfile = useProfileStore((s) => s.load);
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const chatStr = useMemo(
    () => getChatTabStrings(displayLanguage),
    [displayLanguage]
  );
  const { isConnected } = useNetInfo();
  const user = useAuthStore((s) => s.user);
  const isSubscribed = useSubscriptionStore((s) => s.isSubscribed);
  const displayName =
    (profileName && profileName.trim()) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    chatStr.guest;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [resubscribeCount, setResubscribeCount] = useState(0);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [hasAgreedChatTerms, setHasAgreedChatTerms] = useState(false);
  const [termsGateVisible, setTermsGateVisible] = useState(ALWAYS_SHOW_TERMS_GATE);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [termsChecked, setTermsChecked] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const bubbleLayoutsRef = useRef<Record<string, { width: number; height: number }>>({});
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    menuX: number;
    menuY: number;
    bubbleW: number;
    bubbleH: number;
    isMe: boolean;
    group: GroupPos;
    message: ChatMessage | null;
  }>({ visible: false, x: 0, y: 0, menuX: 0, menuY: 0, bubbleW: 0, bubbleH: 0, isMe: false, group: 'single', message: null });
  const [reasonSheetVisible, setReasonSheetVisible] = useState(false);
  const [reasonSheetTarget, setReasonSheetTarget] = useState<ChatMessage | null>(null);
  const [selectedReportReason, setSelectedReportReason] = useState<ChatReportReason | null>(null);
  const reasonSheetTranslateY = useRef(new Animated.Value(0)).current;

  const listRef = useRef<FlatList<ListItem>>(null);
  const bubbleRefs = useRef<Record<string, View | null>>({});
  const inputRef = useRef<TextInput>(null);
  const inputValueRef = useRef('');
  const pendingIdRef = useRef<string | null>(null);
  const scrollToEndRef = useRef(false);
  const scrollToEndUntilRef = useRef(0);
  const preservingOlderPositionRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const initialLoadStartedRef = useRef(false);
  const listDataLengthRef = useRef(0);
  const blockedUserIdsRef = useRef<string[]>([]);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const [atBottom, setAtBottom] = useState(true);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const noMoreHistoryLabel = chatStr.noOlderMessages;
  const replyActionLabel = chatStr.replyAction;
  const unknownReplyLabel = chatStr.originalMessage;

  const performScrollToBottom = useCallback((animated: boolean) => {
    if (preservingOlderPositionRef.current) return;
    listRef.current?.scrollToEnd({ animated });
    setAtBottom(true);
  }, []);

  const requestAutoScrollToBottom = useCallback((ms: number) => {
    scrollToEndRef.current = true;
    scrollToEndUntilRef.current = Date.now() + ms;
  }, []);

  const triggerAutoScrollToBottom = useCallback(
    (ms: number, animated: boolean = false) => {
      requestAutoScrollToBottom(ms);
      performScrollToBottom(animated);
    },
    [requestAutoScrollToBottom, performScrollToBottom]
  );

  const loadMessagesForRoom = useCallback(
    async (targetRoom: ChatRoom, blockedIds: string[]) => {
      const cached = await getCachedChatMessages(targetRoom.id);
      if (cached && cached.length > 0) {
        setMessages(filterBlockedMessages(cached, blockedIds));
        setHasMoreOlder(cached.length >= MESSAGES_PAGE_SIZE);
      }
      const list = await fetchMessagesLatest(targetRoom.id, MESSAGES_PAGE_SIZE);
      setMessages(filterBlockedMessages(list, blockedIds));
      setHasMoreOlder(list.length >= MESSAGES_PAGE_SIZE);
      void setCachedChatMessages(targetRoom.id, list);
      triggerAutoScrollToBottom(800, false);
    },
    [triggerAutoScrollToBottom]
  );

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const status = user
        ? await getChatModerationStatus(CHAT_TERMS_VERSION)
        : {
            agreedTerms: false,
            blockedUserIds: [] as string[],
            isBanned: false,
            banReason: null as string | null,
          };
      setHasAgreedChatTerms(status.agreedTerms);
      setBlockedUserIds(status.blockedUserIds);
      setIsBanned(status.isBanned);
      setBanReason(status.banReason);
      const blockedIds = status.blockedUserIds;
      const [roomList, sid] = await Promise.all([listChatRooms(), getCurrentSenderId()]);
      setSenderId(sid);
      setRooms(roomList);
      let savedId: string | null = null;
      try {
        savedId = await AsyncStorage.getItem(CHAT_SELECTED_ROOM_KEY);
      } catch {
        /* ignore */
      }
      const bySaved = savedId ? roomList.find((x) => x.id === savedId) : undefined;
      const r = bySaved ?? roomList[0] ?? null;
      setRoom(r);
      if (r && savedId !== r.id) {
        try {
          await AsyncStorage.setItem(CHAT_SELECTED_ROOM_KEY, r.id);
        } catch {
          /* ignore */
        }
      }
      if (r) {
        const cached = await getCachedChatMessages(r.id);
        if (cached && cached.length > 0) {
          setMessages(filterBlockedMessages(cached, blockedIds));
          setHasMoreOlder(cached.length >= MESSAGES_PAGE_SIZE);
          setLoading(false);
        }
        await loadMessagesForRoom(r, blockedIds);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [loadMessagesForRoom, user]);

  const selectRoom = useCallback(
    async (next: ChatRoom) => {
      if (next.id === room?.id) return;
      triggerLightImpact();
      setRoom(next);
      try {
        await AsyncStorage.setItem(CHAT_SELECTED_ROOM_KEY, next.id);
      } catch {
        /* ignore */
      }
      setReplyTarget(null);
      setContextMenu((prev) => ({ ...prev, visible: false, message: null }));
      inputValueRef.current = '';
      setInput('');
      setLoadingOlder(false);
      loadingOlderRef.current = false;
      setLoading(true);
      try {
        await loadMessagesForRoom(next, blockedUserIds);
      } finally {
        setLoading(false);
      }
    },
    [room?.id, blockedUserIds, loadMessagesForRoom]
  );

  const showRoomPicker = rooms.length > 1 && room != null;

  const roomPickerBar = showRoomPicker ? (
    <View style={s.roomPickerRow}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.roomPickerScroll}
        accessibilityLabel={chatStr.roomPickerA11y}
        accessibilityRole="scrollbar"
      >
        {rooms.map((rItem) => {
          const label = (rItem.name || DEFAULT_ROOM_NAME).trim() || DEFAULT_ROOM_NAME;
          const active = rItem.id === room?.id;
          return (
            <Pressable
              key={rItem.id}
              onPress={() => void selectRoom(rItem)}
              style={({ pressed }) => [s.roomChip, active && s.roomChipActive, pressed && { opacity: 0.88 }]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
            >
              <Text numberOfLines={1} style={[s.roomChipText, active && s.roomChipTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  ) : null;

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
      if (ALWAYS_SHOW_TERMS_GATE) setTermsGateVisible(true);
      if (!initialLoadStartedRef.current) {
        initialLoadStartedRef.current = true;
        void load();
      }
    }, [loadProfile, load])
  );

  // ブロック解除後に戻ってきたとき、ブロック状態と表示メッセージを再同期する。
  useFocusEffect(
    useCallback(() => {
      if (!initialLoadStartedRef.current || !room?.id) return;
      let cancelled = false;
      const syncOnFocus = async () => {
        const status = user
          ? await getChatModerationStatus(CHAT_TERMS_VERSION)
          : {
              agreedTerms: false,
              blockedUserIds: [] as string[],
              isBanned: false,
              banReason: null as string | null,
            };
        if (cancelled) return;
        setBlockedUserIds(status.blockedUserIds);
        const list = await fetchMessagesLatest(room.id, MESSAGES_PAGE_SIZE);
        if (cancelled) return;
        setMessages(filterBlockedMessages(list, status.blockedUserIds));
        setHasMoreOlder(list.length >= MESSAGES_PAGE_SIZE);
      };
      void syncOnFocus();
      return () => {
        cancelled = true;
      };
    }, [room?.id, user?.id])
  );

  /** ログイン/ログアウト時のみ再取得（load を依存に入れると二重取得になるため user?.id のみ） */
  useEffect(() => {
    if (!initialLoadStartedRef.current) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load は user 変更時のみ再実行したい
  }, [user?.id]);

  useEffect(() => {
    if (!room?.id) return;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    const unsub = subscribeMessages(
      room.id,
      (p) => {
        if (p.new) {
          const msg = p.new as ChatMessage;
          if (blockedUserIdsRef.current.includes(msg.sender_id)) return;
          setMessages((prev) => {
            const idx = prev.findIndex(
              (x) => x.id.startsWith('temp_') && x.content === msg.content && x.sender_id === msg.sender_id
            );
            if (idx !== -1) {
              pendingIdRef.current = null;
              return prev.map((x, i) => (i === idx ? msg : x));
            }
            if (prev.some((x) => x.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
        if (p.old) setMessages((prev) => prev.filter((x) => x.id !== (p.old as ChatMessage).id));
      },
      (status, err) => {
        if (status === 'SUBSCRIBED') {
          reconnectAttemptRef.current = 0;
          setRealtimeError((prev) => (prev === null ? prev : null));
        } else {
          const nextErr = err?.message ?? chatStr.realtimeSubscribeError;
          setRealtimeError((prev) => (prev === nextErr ? prev : nextErr));
          if (!reconnectTimerRef.current) {
            const attempt = Math.min(reconnectAttemptRef.current + 1, 6);
            reconnectAttemptRef.current = attempt;
            const waitMs = Math.min(1000 * 2 ** (attempt - 1), 15000);
            reconnectTimerRef.current = setTimeout(() => {
              reconnectTimerRef.current = null;
              setResubscribeCount((c) => c + 1);
            }, waitMs);
          }
        }
      }
    );
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      unsub();
    };
  }, [room?.id, resubscribeCount, chatStr.realtimeSubscribeError]);

  /** メッセージ更新のたびに直近をキャッシュ（再入室時の体感高速化） */
  useEffect(() => {
    if (!room?.id || messages.length === 0) return;
    const t = setTimeout(() => {
      void setCachedChatMessages(room.id, messages);
    }, 400);
    return () => clearTimeout(t);
  }, [room?.id, messages]);

  useEffect(() => {
    blockedUserIdsRef.current = blockedUserIds;
  }, [blockedUserIds]);

  const onSend = useCallback(() => {
    if (!room?.id || !senderId || sending) return;
    inputRef.current?.blur();
    setSending(true);
    triggerAutoScrollToBottom(1200, false);

    setTimeout(async () => {
      if (isConnected === false) {
        setSending(false);
        Alert.alert(chatStr.sendFailedTitle, chatStr.offlineCannotSend);
        return;
      }
      const text = (inputValueRef.current ?? '').trim();
      const currentReplyTarget =
        replyTarget && !replyTarget.id.startsWith('temp_')
          ? replyTarget
          : null;
      if (!text) {
        setSending(false);
        return;
      }
      inputValueRef.current = '';
      setInput('');

      const tempId = `temp_${Date.now()}`;
      const temp: ChatMessage = {
        id: tempId,
        room_id: room.id,
        sender_id: senderId,
        sender_name: displayName,
        content: text,
        reply_to_message_id: currentReplyTarget?.id ?? null,
        created_at: new Date().toISOString(),
      };
      pendingIdRef.current = tempId;
      setMessages((prev) => [...prev, temp]);
      setReplyTarget(null);
      performScrollToBottom(false);

      try {
        const res = await sendMessage(room.id, text, displayName, currentReplyTarget?.id ?? null);
        if (!res.ok) {
          pendingIdRef.current = null;
          setMessages((prev) => prev.filter((x) => x.id !== tempId));
          inputValueRef.current = text;
          setInput(text);
          setReplyTarget(currentReplyTarget);
          const body =
            res.reason === 'auth' ? chatStr.sendFailedAuthMessage : chatStr.sendFailedMessage;
          Alert.alert(chatStr.sendFailedTitle, body);
        } else {
          setMessages((prev) => prev.map((x) => (x.id === tempId ? res.message : x)));
        }
      } finally {
        setSending(false);
      }
    }, 100);
  }, [
    room?.id,
    senderId,
    displayName,
    sending,
    chatStr.sendFailedTitle,
    chatStr.sendFailedMessage,
    chatStr.sendFailedAuthMessage,
    isConnected,
    triggerAutoScrollToBottom,
    performScrollToBottom,
    replyTarget,
  ]);

  const reportReasonOptions = useMemo(
    () =>
      [
        { id: 'spam', label: chatStr.reportReasonSpam },
        { id: 'harassment', label: chatStr.reportReasonHarassment },
        { id: 'hate', label: chatStr.reportReasonHate },
        { id: 'sexual', label: chatStr.reportReasonSexual },
        { id: 'violence', label: chatStr.reportReasonViolence },
        { id: 'self_harm', label: chatStr.reportReasonSelfHarm },
        { id: 'other', label: chatStr.reportReasonOther },
      ] as { id: ChatReportReason; label: string }[],
    [
      chatStr.reportReasonSpam,
      chatStr.reportReasonHarassment,
      chatStr.reportReasonHate,
      chatStr.reportReasonSexual,
      chatStr.reportReasonViolence,
      chatStr.reportReasonSelfHarm,
      chatStr.reportReasonOther,
    ]
  );

  const openReasonSheet = useCallback((target: ChatMessage) => {
    setReasonSheetTarget(target);
    setSelectedReportReason(null);
    reasonSheetTranslateY.setValue(0);
    setReasonSheetVisible(true);
  }, [reasonSheetTranslateY]);

  const openContextMenu = useCallback(
    (
      target: ChatMessage,
      pageX: number,
      pageY: number,
      locationX: number,
      locationY: number,
      isMe: boolean,
      group: GroupPos
    ) => {
      const menuWidth = 176;
      const layout = bubbleLayoutsRef.current[target.id] ?? {
        width: Math.min(Math.max(target.content.length * 8 + 28, 90), bubbleMaxW),
        height: 38,
      };
      const bubbleW = Math.min(layout.width, bubbleMaxW);
      const bubbleH = Math.max(layout.height, 34);
      const applyPosition = (rawX: number, rawY: number) => {
        const bubbleX = isMe
          ? Math.max(0, Math.min(rawX, windowWidth - bubbleW - 10))
          : 10;
        const bubbleY = rawY;
        const menuX = isMe
          ? Math.max(0, Math.min(bubbleX + bubbleW - menuWidth - 8, windowWidth - menuWidth - 10))
          : 10;
        const menuY = Math.min(bubbleY + bubbleH + 10, windowHeight - 180);

        triggerLightImpact();
        setContextMenu({
          visible: true,
          x: bubbleX,
          y: bubbleY,
          menuX,
          menuY,
          bubbleW,
          bubbleH,
          isMe,
          group,
          message: target,
        });
      };

      const ref = bubbleRefs.current[target.id];
      if (ref?.measureInWindow) {
        ref.measureInWindow((x, y) => {
          applyPosition(x, y);
        });
        return;
      }

      applyPosition(pageX - locationX, pageY - locationY);
    },
    [bubbleMaxW, headerPaddingTop, windowHeight, windowWidth]
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false, message: null }));
  }, []);

  const performCopy = useCallback(
    async (target: ChatMessage) => {
      await Clipboard.setStringAsync(target.content);
      Alert.alert(chatStr.copySuccessTitle, chatStr.copySuccessBody);
    },
    [chatStr.copySuccessBody, chatStr.copySuccessTitle]
  );

  const executeBlock = useCallback(async (target: ChatMessage, reason: ChatReportReason): Promise<boolean> => {
    const targetUserId = target.sender_id;
    const ok = await blockUser(targetUserId, reason, target.id);
    if (ok) {
      setBlockedUserIds((prev) => (prev.includes(targetUserId) ? prev : [...prev, targetUserId]));
      setMessages((prev) => prev.filter((m) => m.sender_id !== targetUserId));
    }
    return ok;
  }, []);

  const performReport = useCallback(
    async (target: ChatMessage, reason: ChatReportReason) => {
      const ok = await reportMessage(target.id, target.sender_id, reason);
      if (!ok) {
        Alert.alert(chatStr.reportFailedTitle, chatStr.reportFailedBody);
        return;
      }
      Alert.alert(chatStr.reportSuccessTitle, chatStr.reportSuccessBody, [
        { text: chatStr.cancel, style: 'cancel' },
        {
          text: chatStr.blockAction,
          style: 'destructive',
          onPress: async () => {
            const blockOk = await executeBlock(target, reason);
            Alert.alert(
              blockOk ? chatStr.blockSuccessTitle : chatStr.blockFailedTitle,
              blockOk ? chatStr.blockSuccessBody : chatStr.blockFailedBody
            );
          },
        },
      ]);
    },
    [
      chatStr.blockAction,
      chatStr.blockFailedBody,
      chatStr.blockFailedTitle,
      chatStr.blockSuccessBody,
      chatStr.blockSuccessTitle,
      chatStr.cancel,
      chatStr.reportFailedBody,
      chatStr.reportFailedTitle,
      chatStr.reportSuccessBody,
      chatStr.reportSuccessTitle,
      executeBlock,
    ]
  );

  const performBlock = useCallback(
    async (target: ChatMessage) => {
      const targetUserId = target.sender_id;
      if (blockedUserIds.includes(targetUserId)) {
        Alert.alert(chatStr.blockSuccessTitle, chatStr.blockSuccessBody);
        return;
      }
      Alert.alert(chatStr.blockConfirmTitle, chatStr.blockConfirmBody, [
        { text: chatStr.cancel, style: 'cancel' },
        {
          text: chatStr.blockAction,
          style: 'destructive',
          onPress: async () => {
            const ok = await executeBlock(target, 'other');
            if (!ok) {
              Alert.alert(chatStr.blockFailedTitle, chatStr.blockFailedBody);
              return;
            }
            Alert.alert(chatStr.blockSuccessTitle, chatStr.blockSuccessBody, [
              { text: chatStr.cancel, style: 'cancel' },
              {
                text: chatStr.manageBlockedUsers,
                onPress: () => {
                  router.push('/chat-blocked-users');
                },
              },
              {
                text: chatStr.unblockAction,
                onPress: async () => {
                  const unblocked = await unblockUser(targetUserId);
                  if (!unblocked) {
                    Alert.alert(chatStr.unblockFailedTitle, chatStr.unblockFailedBody);
                    return;
                  }
                  setBlockedUserIds((prev) => prev.filter((id) => id !== targetUserId));
                  Alert.alert(chatStr.unblockSuccessTitle, chatStr.unblockSuccessBody);
                  void load();
                },
              },
            ]);
          },
        },
      ]);
    },
    [
      blockedUserIds,
      chatStr.blockAction,
      chatStr.blockConfirmBody,
      chatStr.blockConfirmTitle,
      chatStr.blockFailedBody,
      chatStr.blockFailedTitle,
      chatStr.blockSuccessBody,
      chatStr.blockSuccessTitle,
      chatStr.cancel,
      chatStr.manageBlockedUsers,
      chatStr.unblockAction,
      chatStr.unblockFailedBody,
      chatStr.unblockFailedTitle,
      chatStr.unblockSuccessBody,
      chatStr.unblockSuccessTitle,
      executeBlock,
      load,
    ]
  );

  const onSelectReason = useCallback((reason: ChatReportReason) => {
    setSelectedReportReason((prev) => (prev === reason ? null : reason));
  }, []);

  const closeReasonSheetImmediate = useCallback(() => {
    setReasonSheetVisible(false);
    setReasonSheetTarget(null);
    setSelectedReportReason(null);
    reasonSheetTranslateY.setValue(0);
  }, [reasonSheetTranslateY]);

  const closeReasonSheet = useCallback(() => {
    Animated.timing(reasonSheetTranslateY, {
      toValue: 420,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      closeReasonSheetImmediate();
    });
  }, [closeReasonSheetImmediate, reasonSheetTranslateY]);

  const submitReportFromSheet = useCallback(() => {
    if (!reasonSheetTarget || !selectedReportReason) {
      closeReasonSheet();
      return;
    }
    const target = reasonSheetTarget;
    const reason = selectedReportReason;
    closeReasonSheetImmediate();
    void performReport(target, reason);
  }, [closeReasonSheet, closeReasonSheetImmediate, performReport, reasonSheetTarget, selectedReportReason]);

  const reasonSheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dy > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy <= 0) {
            reasonSheetTranslateY.setValue(0);
            return;
          }
          reasonSheetTranslateY.setValue(gestureState.dy);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 120 || gestureState.vy > 1.1) {
            closeReasonSheet();
            return;
          }
          Animated.spring(reasonSheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 18,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(reasonSheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 18,
          }).start();
        },
      }),
    [closeReasonSheet, reasonSheetTranslateY]
  );

  const handleAgreeTerms = useCallback(async () => {
    const ok = await agreeChatTerms(CHAT_TERMS_VERSION);
    if (!ok) {
      Alert.alert(chatStr.termsAgreeFailedTitle, chatStr.termsAgreeFailedBody);
      return;
    }
    setHasAgreedChatTerms(true);
    setTermsGateVisible(false);
    setTermsChecked(false);
  }, [chatStr.termsAgreeFailedBody, chatStr.termsAgreeFailedTitle]);

  const loadOlder = useCallback(async () => {
    if (!room?.id || !hasMoreOlder || loadingOlderRef.current || messages.length === 0) return;
    loadingOlderRef.current = true;
    preservingOlderPositionRef.current = true;
    // 過去履歴読み込み時は末尾への自動追従を明示的に停止
    scrollToEndRef.current = false;
    scrollToEndUntilRef.current = 0;
    setLoadingOlder(true);
    const oldest = messages[0];
    try {
      const older = await fetchMessagesOlderThan(room.id, oldest.created_at, MESSAGES_PAGE_SIZE);
      if (older.length > 0) {
        setMessages((prev) =>
          dedupeMessagesById([...filterBlockedMessages(older, blockedUserIds), ...prev])
        );
      }
      setHasMoreOlder(older.length >= MESSAGES_PAGE_SIZE);
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
      setTimeout(() => {
        preservingOlderPositionRef.current = false;
      }, 0);
    }
  }, [room?.id, hasMoreOlder, messages, blockedUserIds]);

  const onRefresh = useCallback(async () => {
    if (!room?.id || refreshing) return;
    setRefreshing(true);
    const list = await fetchMessagesLatest(room.id, MESSAGES_PAGE_SIZE);
    setMessages(filterBlockedMessages(list, blockedUserIds));
    setHasMoreOlder(list.length >= MESSAGES_PAGE_SIZE);
    void setCachedChatMessages(room.id, list);
    triggerAutoScrollToBottom(600, false);
    setRefreshing(false);
  }, [room?.id, refreshing, triggerAutoScrollToBottom, blockedUserIds]);

  const getDateLabel = useCallback(
    (d: string) =>
      dateLabelForLocale(d, chatStr.today, chatStr.yesterday, displayLanguage),
    [chatStr.today, chatStr.yesterday, displayLanguage]
  );
  const listData = useMemo(() => buildList(messages, getDateLabel), [messages, getDateLabel]);
  const messageById = useMemo(() => new Map(messages.map((m) => [m.id, m] as const)), [messages]);
  useEffect(() => {
    listDataLengthRef.current = listData.length;
  }, [listData.length]);
  const inputPadBottom = keyboardHeight > 0 ? 12 : tabBarPaddingBottom + 12;
  const listPadBottom = 12;

  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(show, (e: { endCoordinates?: { height: number } }) =>
      setKeyboardHeight(e.endCoordinates?.height ?? 0)
    );
    const subHide = Keyboard.addListener(hide, () => setKeyboardHeight(0));
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  useEffect(() => {
    if (keyboardHeight > 0 && listData.length > 0 && atBottom) {
      const t = setTimeout(
        () => triggerAutoScrollToBottom(300, true),
        Platform.OS === 'ios' ? 100 : 50
      );
      return () => clearTimeout(t);
    }
  }, [keyboardHeight, listData.length, atBottom, triggerAutoScrollToBottom]);

  const onContentSizeChange = useCallback(() => {
    const now = Date.now();
    if (now >= scrollToEndUntilRef.current) {
      scrollToEndRef.current = false;
    }
    if (preservingOlderPositionRef.current) return;
    if (scrollToEndRef.current || now < scrollToEndUntilRef.current) {
      performScrollToBottom(false);
    }
  }, [performScrollToBottom]);

  useFocusEffect(
    useCallback(() => {
      if (listDataLengthRef.current > 0) {
        triggerAutoScrollToBottom(600, false);
      }
    }, [triggerAutoScrollToBottom])
  );

  const onScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
      const nearBottom = distanceFromBottom <= SCROLL_TO_BOTTOM_SHOW_OFFSET;
      setAtBottom(nearBottom);
      if (contentOffset.y < 80 && hasMoreOlder && !loadingOlderRef.current) {
        loadOlder();
      }
    },
    [hasMoreOlder, loadOlder]
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'date') {
        return (
          <View style={s.dateWrap}>
            <Text style={s.dateText}>{item.label}</Text>
          </View>
        );
      }
      const m = item.message;
      const group = item.group;
      const isMe = m.sender_id === senderId;
      const name = m.sender_name ?? chatStr.guest;
      const initial = name.slice(0, 1).toUpperCase();
      const color = avatarColor(m.sender_id);
      const marginBottom = rowMarginBottom(group);

      if (isMe) {
        return (
          <View style={[s.rowMe, { marginBottom }]}>
            {(group === 'last' || group === 'single') && (
              <Text style={s.timeText}>{timeStr(m.created_at, displayLanguage)}</Text>
            )}
            <Pressable
              onLongPress={(event) => {
                openContextMenu(
                  m,
                  event.nativeEvent.pageX,
                  event.nativeEvent.pageY,
                  event.nativeEvent.locationX,
                  event.nativeEvent.locationY,
                  true,
                  group
                );
              }}
              delayLongPress={250}
              accessibilityRole="button"
              accessibilityLabel={chatStr.userActionA11y(name)}
            >
            <View
              style={bubbleStyleMe(colors, group, bubbleMaxW) as any}
              ref={(node) => {
                bubbleRefs.current[m.id] = node;
              }}
              onLayout={(event) => {
                const { width, height } = event.nativeEvent.layout;
                const prev = bubbleLayoutsRef.current[m.id];
                if (prev?.width === width && prev?.height === height) return;
                bubbleLayoutsRef.current[m.id] = { width, height };
              }}
            >
              {m.reply_to_message_id ? (
                <View style={s.replyQuoteMe}>
                  <Text style={s.replyQuoteNameMe}>{messageById.get(m.reply_to_message_id)?.sender_name ?? unknownReplyLabel}</Text>
                  <Text numberOfLines={1} style={s.replyQuoteTextMe}>
                    {messageById.get(m.reply_to_message_id)?.content ?? unknownReplyLabel}
                  </Text>
                </View>
              ) : null}
              <Text style={s.bubbleText}>{m.content}</Text>
            </View>
            </Pressable>
          </View>
        );
      }
      const showAvatar = group === 'first' || group === 'single';
      return (
        <View style={[s.rowOther, { marginBottom }]}>
          {showAvatar ? (
            <View style={s.avatarWrap}>
              <View style={[s.avatar, { backgroundColor: color }]}>
                <Text style={s.avatarText}>{initial}</Text>
              </View>
            </View>
          ) : (
            <View style={s.avatarPlaceholder} />
          )}
          <View style={s.bodyOther}>
            {showAvatar && <Text style={s.nameText}>{name}</Text>}
            {(group === 'last' || group === 'single') ? (
              <View style={s.bubbleWithTimeRow}>
                <Pressable
                  onLongPress={(event) => {
                    openContextMenu(
                      m,
                      event.nativeEvent.pageX,
                      event.nativeEvent.pageY,
                      event.nativeEvent.locationX,
                      event.nativeEvent.locationY,
                      false,
                      group
                    );
                  }}
                  delayLongPress={250}
                  accessibilityRole="button"
                  accessibilityLabel={chatStr.userActionA11y(name)}
                >
                  <View
                    style={bubbleStyleOther(colors, group, bubbleMaxW) as any}
                    ref={(node) => {
                      bubbleRefs.current[m.id] = node;
                    }}
                    onLayout={(event) => {
                      const { width, height } = event.nativeEvent.layout;
                      const prev = bubbleLayoutsRef.current[m.id];
                      if (prev?.width === width && prev?.height === height) return;
                      bubbleLayoutsRef.current[m.id] = { width, height };
                    }}
                  >
                    {m.reply_to_message_id ? (
                      <View style={s.replyQuoteOther}>
                        <Text style={s.replyQuoteNameOther}>{messageById.get(m.reply_to_message_id)?.sender_name ?? unknownReplyLabel}</Text>
                        <Text numberOfLines={1} style={s.replyQuoteTextOther}>
                          {messageById.get(m.reply_to_message_id)?.content ?? unknownReplyLabel}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={s.bubbleTextDark}>{m.content}</Text>
                  </View>
                </Pressable>
                <Text style={s.timeTextOther}>{timeStr(m.created_at, displayLanguage)}</Text>
              </View>
            ) : (
              <Pressable
                onLongPress={(event) => {
                  openContextMenu(
                    m,
                    event.nativeEvent.pageX,
                    event.nativeEvent.pageY,
                    event.nativeEvent.locationX,
                    event.nativeEvent.locationY,
                    false,
                    group
                  );
                }}
                delayLongPress={250}
                accessibilityRole="button"
                accessibilityLabel={chatStr.userActionA11y(name)}
              >
              <View
                style={bubbleStyleOther(colors, group, bubbleMaxW) as any}
                ref={(node) => {
                  bubbleRefs.current[m.id] = node;
                }}
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  const prev = bubbleLayoutsRef.current[m.id];
                  if (prev?.width === width && prev?.height === height) return;
                  bubbleLayoutsRef.current[m.id] = { width, height };
                }}
              >
                {m.reply_to_message_id ? (
                  <View style={s.replyQuoteOther}>
                    <Text style={s.replyQuoteNameOther}>{messageById.get(m.reply_to_message_id)?.sender_name ?? unknownReplyLabel}</Text>
                    <Text numberOfLines={1} style={s.replyQuoteTextOther}>
                      {messageById.get(m.reply_to_message_id)?.content ?? unknownReplyLabel}
                    </Text>
                  </View>
                ) : null}
                <Text style={s.bubbleTextDark}>{m.content}</Text>
              </View>
              </Pressable>
            )}
          </View>
        </View>
      );
    },
    [senderId, colors, s, bubbleMaxW, chatStr, openContextMenu, messageById, unknownReplyLabel]
  );

  /** ルーム取得前の短い待機（通常は一瞬） */
  if (!room && loading && !loadError) {
    return (
      <View style={s.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
        <TabHeader
          title={chatStr.title}
          subtitle=""
          paddingTop={headerPaddingTop}
          contentWidth={contentW}
          theme={headerTheme}
          shadow={headerShadow}
          onPressRight={() => router.push('/chat-blocked-users')}
          rightButtonA11y={chatStr.manageBlockedUsers}
          rightIconName="ellipsis-horizontal"
        />
        <View style={[s.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={s.hint}>{chatStr.loading}</Text>
        </View>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={s.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
        <View style={s.center}>
          <Text style={s.hint}>{chatStr.loadFailed}</Text>
          <Pressable style={s.retryBtn} onPress={load} accessibilityLabel={chatStr.retry} accessibilityRole="button">
            <Text style={s.retryText}>{chatStr.retry}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <View style={s.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
        <View style={s.center}>
          <Text style={s.hint}>{chatStr.supabaseNotConfigured}</Text>
        </View>
      </View>
    );
  }

  if (!room) {
    return (
      <View style={s.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
        <View style={s.center}>
          <Text style={s.hint}>{chatStr.noRoom}</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={s.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
        <TabHeader
          title={chatStr.title}
          subtitle={room ? (room.name || DEFAULT_ROOM_NAME) : ''}
          paddingTop={headerPaddingTop}
          contentWidth={contentW}
          theme={headerTheme}
          shadow={headerShadow}
          onPressRight={() => router.push('/chat-blocked-users')}
          rightButtonA11y={chatStr.manageBlockedUsers}
          rightIconName="ellipsis-horizontal"
        />
        {roomPickerBar}
        <View style={s.center}>
          <Text style={s.hint}>{chatStr.loginRequiredForChat}</Text>
          <Pressable
            style={s.retryBtn}
            onPress={() => router.push('/login')}
            accessibilityRole="button"
            accessibilityLabel={chatStr.loginButtonA11y}
          >
            <Text style={s.retryText}>{chatStr.loginButton}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isBanned) {
    return (
      <View style={s.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
        <TabHeader
          title={chatStr.title}
          subtitle={room ? (room.name || DEFAULT_ROOM_NAME) : ''}
          paddingTop={headerPaddingTop}
          contentWidth={contentW}
          theme={headerTheme}
          shadow={headerShadow}
          onPressRight={() => router.push('/chat-blocked-users')}
          rightButtonA11y={chatStr.manageBlockedUsers}
          rightIconName="ellipsis-horizontal"
        />
        {roomPickerBar}
        <View style={s.center}>
          <Text style={s.hint}>{chatStr.chatRestricted}</Text>
          {banReason ? <Text style={s.hint}>{banReason}</Text> : null}
        </View>
      </View>
    );
  }

  const showMessageSkeleton = loading && messages.length === 0;

  return (
    <ErrorBoundary contextLabel={chatStr.title}>
    <View style={s.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />

      <TabHeader
        title={chatStr.title}
        subtitle={room ? (room.name || DEFAULT_ROOM_NAME) : ''}
        paddingTop={headerPaddingTop}
        contentWidth={contentW}
        theme={headerTheme}
        shadow={headerShadow}
        onPressRight={() => router.push('/chat-blocked-users')}
        rightButtonA11y={chatStr.manageBlockedUsers}
        rightIconName="ellipsis-horizontal"
      />

      {roomPickerBar}

      {realtimeError && (
        <Pressable
          style={s.realtimeBanner}
          onPress={() => {
            reconnectAttemptRef.current = 0;
            if (reconnectTimerRef.current) {
              clearTimeout(reconnectTimerRef.current);
              reconnectTimerRef.current = null;
            }
            setRealtimeError(null);
            setResubscribeCount((c) => c + 1);
          }}
          accessibilityLabel={chatStr.reconnectA11y}
          accessibilityRole="button"
        >
          <Ionicons name="cloud-offline-outline" size={18} color={colors.onPrimary} />
          <Text style={s.realtimeBannerText}>{chatStr.reconnectBanner}</Text>
        </Pressable>
      )}

      <View style={[s.body, { paddingBottom: keyboardHeight }]}>
        <FlatList
          ref={listRef}
          data={listData}
          keyExtractor={(x) => x.key}
          renderItem={renderItem}
          contentContainerStyle={[s.listContent, { paddingBottom: listPadBottom }]}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={100}
          onContentSizeChange={onContentSizeChange}
          maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 10 }}
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          windowSize={15}
          accessibilityLabel={chatStr.chatListA11y}
          accessibilityRole="list"
          ListEmptyComponent={
            showMessageSkeleton ? (
              <View>
                <Text style={s.listLoadingHint}>{chatStr.loading}</Text>
                <ChatListSkeleton styles={s} />
              </View>
            ) : (
              <Text style={s.empty}>{chatStr.emptyMessages}</Text>
            )
          }
          ListHeaderComponent={
            loadingOlder ? (
              <View style={s.olderLoader}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : !hasMoreOlder && messages.length > 0 ? (
              <View style={s.olderLoader}>
                <Text style={s.hint}>{noMoreHistoryLabel}</Text>
              </View>
            ) : null
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} />}
        />

        {(loadingOlder || !atBottom) && (
          <Pressable
            style={[
              s.scrollToBottomBtn,
              // 入力欄（inputWrap）の上に被せないように、実際の余白量で上方向へ調整
              { bottom: inputPadBottom + 70, zIndex: 50 },
            ]}
            onPress={() => triggerAutoScrollToBottom(200, true)}
            accessibilityLabel={chatStr.scrollToBottomA11y}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-down" size={24} color={colors.onPrimary} />
          </Pressable>
        )}

        <View style={[s.inputWrap, { paddingBottom: inputPadBottom }]}>
          {!user ? (
            <View style={s.chatProOnlyWrap}>
              <Text style={s.chatProOnlyText}>{chatStr.loginToChat}</Text>
              <Pressable
                style={({ pressed }) => [s.chatProOnlyBtn, pressed && { opacity: 0.9 }]}
                onPress={() => router.push('/login')}
                accessibilityLabel={chatStr.loginButtonA11y}
                accessibilityRole="button"
              >
                <Text style={s.chatProOnlyBtnText}>{chatStr.loginButton}</Text>
              </Pressable>
            </View>
          ) : !isSubscribed ? (
            <View style={s.chatProOnlyWrap}>
              <Text style={s.chatProOnlyText}>{chatStr.proOnly}</Text>
              <Pressable
                style={({ pressed }) => [s.chatProOnlyBtn, pressed && { opacity: 0.9 }]}
                onPress={() => router.push('/subscription')}
                accessibilityLabel={chatStr.proButtonA11y}
                accessibilityRole="button"
              >
                <Text style={s.chatProOnlyBtnText}>{chatStr.proButton}</Text>
              </Pressable>
            </View>
          ) : (
            <>
            {replyTarget ? (
              <View style={s.replyComposerBox}>
                <View style={s.replyComposerMain}>
                  <Text style={s.replyComposerLabel}>{chatStr.replyToUserLabel(replyTarget.sender_name ?? chatStr.guest)}</Text>
                  <Text numberOfLines={1} style={s.replyComposerText}>{replyTarget.content}</Text>
                </View>
                <Pressable
                  onPress={() => setReplyTarget(null)}
                  style={s.replyComposerClose}
                  accessibilityRole="button"
                  accessibilityLabel={chatStr.cancel}
                >
                  <Ionicons name="close" size={16} color={colors.textSecondary} />
                </Pressable>
              </View>
            ) : null}
            <View style={s.inputRow}>
              <TextInput
                ref={inputRef}
                style={s.input}
                placeholder={chatStr.messagePlaceholder}
                placeholderTextColor={colors.textSecondary}
                value={input}
                onChangeText={(text) => {
                  inputValueRef.current = text;
                  setInput(text);
                }}
                multiline
                maxLength={500}
                editable={!sending && isConnected !== false}
                blurOnSubmit={false}
                keyboardAppearance={keyboardAppearance}
                accessibilityLabel={chatStr.messageInputA11y}
              />
              <Pressable
                style={[
                  s.sendBtn,
                  (!input.trim() || sending || isConnected === false) && s.sendBtnDisabled,
                ]}
                onPress={onSend}
                disabled={!input.trim() || sending || isConnected === false}
                accessibilityLabel={chatStr.sendA11y}
                accessibilityRole="button"
              >
                <Ionicons name="send" size={20} color={colors.onPrimary} />
              </Pressable>
            </View>
            </>
          )}
        </View>
      </View>

      <Modal
        visible={contextMenu.visible && contextMenu.message != null}
        transparent
        animationType="fade"
        onRequestClose={closeContextMenu}
      >
        <Pressable
          style={s.contextMenuBackdrop}
          onPress={closeContextMenu}
          accessibilityRole="button"
          accessibilityLabel={chatStr.cancel}
        >
          <BlurView intensity={42} tint={resolvedMode === 'dark' ? 'dark' : 'light'} style={s.contextMenuBlur} />
          <View style={s.contextMenuDim} />

          {contextMenu.message ? (
            <View
              style={[
                s.contextMenuBubbleWrap,
                { left: contextMenu.x, top: contextMenu.y, width: contextMenu.bubbleW, minHeight: contextMenu.bubbleH },
              ]}
              pointerEvents="none"
            >
              <View style={contextMenu.isMe ? (bubbleStyleMe(colors, contextMenu.group, bubbleMaxW) as any) : (bubbleStyleOther(colors, contextMenu.group, bubbleMaxW) as any)}>
                {contextMenu.message.reply_to_message_id ? (
                  <View style={contextMenu.isMe ? s.replyQuoteMe : s.replyQuoteOther}>
                    <Text style={contextMenu.isMe ? s.replyQuoteNameMe : s.replyQuoteNameOther}>
                      {messageById.get(contextMenu.message.reply_to_message_id)?.sender_name ?? unknownReplyLabel}
                    </Text>
                    <Text numberOfLines={1} style={contextMenu.isMe ? s.replyQuoteTextMe : s.replyQuoteTextOther}>
                      {messageById.get(contextMenu.message.reply_to_message_id)?.content ?? unknownReplyLabel}
                    </Text>
                  </View>
                ) : null}
                <Text style={contextMenu.isMe ? s.bubbleText : s.bubbleTextDark}>{contextMenu.message.content}</Text>
              </View>
            </View>
          ) : null}

          <Pressable
            style={[s.contextMenuBox, { left: contextMenu.menuX, top: contextMenu.menuY }]}
            onPress={(event) => event.stopPropagation()}
          >
            <Pressable
              style={s.contextMenuItem}
              onPress={() => {
                const target = contextMenu.message;
                closeContextMenu();
                if (target) setReplyTarget(target);
              }}
            >
              <Text style={s.contextMenuItemText}>{replyActionLabel}</Text>
            </Pressable>
            <View style={s.contextMenuDivider} />
            <Pressable
              style={s.contextMenuItem}
              onPress={() => {
                const target = contextMenu.message;
                closeContextMenu();
                if (target) void performCopy(target);
              }}
            >
              <Text style={s.contextMenuItemText}>{chatStr.copyAction}</Text>
            </Pressable>
            {!contextMenu.isMe ? (
              <>
                <View style={s.contextMenuDivider} />
                <Pressable
                  style={s.contextMenuItem}
                  onPress={() => {
                    const target = contextMenu.message;
                    closeContextMenu();
                    if (target) openReasonSheet(target);
                  }}
                >
                  <Text style={s.contextMenuItemText}>{chatStr.reportAction}</Text>
                </Pressable>
                <View style={s.contextMenuDivider} />
                <Pressable
                  style={[s.contextMenuItem, s.contextMenuItemDanger]}
                  onPress={() => {
                    const target = contextMenu.message;
                    closeContextMenu();
                    if (target) void performBlock(target);
                  }}
                >
                  <Text style={s.contextMenuItemDangerText}>{chatStr.blockAction}</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={reasonSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={closeReasonSheet}
      >
        <Pressable
          style={s.reasonSheetBackdrop}
          onPress={closeReasonSheet}
          accessibilityRole="button"
          accessibilityLabel={chatStr.cancel}
        >
          <Animated.View
            style={[s.reasonSheetCard, { transform: [{ translateY: reasonSheetTranslateY }] }]}
            {...reasonSheetPanResponder.panHandlers}
          >
            <Pressable onPress={(event) => event.stopPropagation()}>
            <View style={s.reasonSheetHandle} />
            <Text style={s.reasonSheetTitle}>{chatStr.reportReasonTitle}</Text>
            {reportReasonOptions.map((option, idx) => (
              <View key={option.id}>
                <Pressable
                  style={[s.reasonSheetItem, selectedReportReason === option.id && s.reasonSheetItemSelected]}
                  onPress={() => onSelectReason(option.id)}
                  accessibilityRole="button"
                >
                  <Text style={s.reasonSheetItemText}>{option.label}</Text>
                </Pressable>
                {idx < reportReasonOptions.length - 1 ? <View style={s.reasonSheetDivider} /> : null}
              </View>
            ))}
            <Pressable
              style={[s.reasonSheetCancel, selectedReportReason ? s.reasonSheetSubmitBtn : null]}
              onPress={submitReportFromSheet}
              accessibilityRole="button"
              accessibilityLabel={selectedReportReason ? chatStr.reportSubmitAction : chatStr.cancel}
            >
              <Text style={selectedReportReason ? s.reasonSheetSubmitText : s.reasonSheetCancelText}>
                {selectedReportReason ? chatStr.reportSubmitAction : chatStr.cancel}
              </Text>
            </Pressable>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      <Modal
        visible={user != null && (!hasAgreedChatTerms || termsGateVisible)}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={s.safetyModalBackdrop}>
          <View style={s.safetyModalBox}>
            <Text style={s.safetyTitle}>{chatStr.termsModalTitle}</Text>
            <Text style={s.safetyBody}>{chatStr.termsModalBody}</Text>
            <Pressable
              style={s.safetyCheckRow}
              onPress={() => setTermsChecked((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsChecked }}
              accessibilityLabel={chatStr.termsConsentCheckboxA11y}
            >
              <View style={s.safetyCheckBox}>
                {termsChecked ? <Ionicons name="checkmark" size={16} color={colors.accent} /> : null}
              </View>
              <Text style={s.safetyCheckText}>{chatStr.termsConsentCheckbox}</Text>
            </Pressable>
            <View style={s.safetyLinkWrap}>
              <Pressable
                onPress={() => {
                  if (TERMS_URL) void WebBrowser.openBrowserAsync(TERMS_URL);
                }}
                accessibilityRole="link"
                accessibilityLabel={chatStr.openTermsA11y}
              >
                <Text style={s.safetyLinkText}>{chatStr.openTerms}</Text>
              </Pressable>
            </View>
            <View style={s.safetyActions}>
              <Pressable
                style={[s.safetyBtn, s.safetyBtnGhost]}
                onPress={() => {
                  setTermsGateVisible(false);
                  setTermsChecked(false);
                  router.replace('/(tabs)');
                }}
                accessibilityRole="button"
                accessibilityLabel={chatStr.termsDeclineA11y}
              >
                <Text style={s.safetyBtnGhostText}>{chatStr.termsDecline}</Text>
              </Pressable>
              <Pressable
                style={[s.safetyBtn, s.safetyBtnPrimary, !termsChecked && { opacity: 0.45 }]}
                disabled={!termsChecked}
                onPress={() => {
                  void handleAgreeTerms();
                }}
                accessibilityRole="button"
                accessibilityLabel={chatStr.termsAgreeA11y}
              >
                <Text style={s.safetyBtnPrimaryText}>{chatStr.termsAgree}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </ErrorBoundary>
  );
}
