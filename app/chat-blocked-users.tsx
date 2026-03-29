import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useProfileStore } from '@/src/store/profileStore';
import { getChatTabStrings } from '@/src/i18n/appScreens';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useContentColumnWidth } from '@/src/hooks/useContentColumnWidth';
import { typographyScale } from '@/src/theme';
import { getBlockedChatUsers, unblockUser, type BlockedChatUser } from '@/src/supabase/chat';

const PAD = 24;

export default function ChatBlockedUsersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { headerPaddingTop } = useSafeArea();
  const contentW = useContentColumnWidth(PAD);
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const chatStr = useMemo(() => getChatTabStrings(displayLanguage), [displayLanguage]);
  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<BlockedChatUser[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const users = await getBlockedChatUsers();
      setBlockedUsers(users);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        header: {
          paddingTop: headerPaddingTop,
          paddingHorizontal: PAD,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        headerInner: {
          width: contentW,
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 14,
        },
        iconBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        title: { ...typographyScale.header, color: colors.text },
        listContent: { padding: PAD, alignItems: 'center' },
        listInner: { width: contentW, gap: 10 },
        emptyText: { ...typographyScale.body, color: colors.textSecondary, textAlign: 'center', marginTop: 20 },
        row: {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        },
        labelText: { ...typographyScale.caption, color: colors.textSecondary, marginBottom: 2 },
        idText: { ...typographyScale.bodySmall, color: colors.text, flex: 1 },
        actionBtn: {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 12,
          backgroundColor: colors.accentSoft,
        },
        actionText: { ...typographyScale.badge, color: colors.accent, fontWeight: '700' },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
      }),
    [colors, contentW, headerPaddingTop]
  );

  const onUnblock = useCallback(
    (user: BlockedChatUser) => {
      const label = user.displayName?.trim() || chatStr.guest;
      Alert.alert(chatStr.unblockAction, label, [
        { text: chatStr.cancel, style: 'cancel' },
        {
          text: chatStr.unblockAction,
          onPress: async () => {
            const ok = await unblockUser(user.userId);
            if (!ok) {
              Alert.alert(chatStr.unblockFailedTitle, chatStr.unblockFailedBody);
              return;
            }
            setBlockedUsers((prev) => prev.filter((x) => x.userId !== user.userId));
            Alert.alert(chatStr.unblockSuccessTitle, chatStr.unblockSuccessBody);
          },
        },
      ]);
    },
    [chatStr.cancel, chatStr.guest, chatStr.unblockAction, chatStr.unblockFailedBody, chatStr.unblockFailedTitle, chatStr.unblockSuccessBody, chatStr.unblockSuccessTitle]
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, colors.surface]} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={chatStr.cancel}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>{chatStr.blockedUsersTitle}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : blockedUsers.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{chatStr.noBlockedUsers}</Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.listInner}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.labelText}>{chatStr.blockedUserNameLabel}</Text>
                  <Text style={styles.idText}>{item.displayName?.trim() || chatStr.guest}</Text>
                </View>
                <Pressable style={styles.actionBtn} onPress={() => onUnblock(item)} accessibilityRole="button">
                  <Text style={styles.actionText}>{chatStr.unblockAction}</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
