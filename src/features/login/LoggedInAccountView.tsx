import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { triggerLightImpact } from '@/src/utils/haptics';
import { CONTENT_W } from '@/src/theme/settingsFlowTokens';
import type { LoginStyles, LoginToken } from '@/src/features/login/loginStyles';
import type { LoginUiStrings } from '@/src/i18n/login';

export type LoggedInAccountViewProps = {
  ui: LoginUiStrings;
  headerPaddingTop: number;
  keyboardAppearance: 'light' | 'dark';
  onBack: () => void;
  styles: LoginStyles;
  token: LoginToken;
  nameDisplay: string;
  emailLine: string;
  editingField: 'name' | null;
  profileNameDraft: string;
  setProfileNameDraft: (v: string) => void;
  startEditName: () => void;
  saveName: () => void;
  cancelEdit: () => void;
  emailModalVisible: boolean;
  setEmailModalVisible: (v: boolean) => void;
  newEmail: string;
  setNewEmail: (v: string) => void;
  submitEmailChange: () => Promise<void>;
  emailChangeLoading: boolean;
  passwordModalVisible: boolean;
  setPasswordModalVisible: (v: boolean) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  newPasswordConfirm: string;
  setNewPasswordConfirm: (v: string) => void;
  submitPasswordChange: () => Promise<void>;
  passwordChangeLoading: boolean;
  confirmDeleteAccount: () => void;
  deleteAccountLoading: boolean;
  onSignOut: () => Promise<void>;
};

export function LoggedInAccountView(p: LoggedInAccountViewProps) {
  const s = p.styles;
  const TOKEN = p.token;
  const u = p.ui;

  return (
    <View style={[s.container, { paddingTop: p.headerPaddingTop }]}>
      <LinearGradient colors={[TOKEN.bg, TOKEN.bgEnd]} style={StyleSheet.absoluteFill} />
      <View style={s.header}>
        <Pressable
          style={s.backBtn}
          onPress={() => {
            void triggerLightImpact();
            p.onBack();
          }}
          accessibilityLabel={u.backA11y}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={TOKEN.ink} />
        </Pressable>
        <Text style={s.title}>{u.screenTitleAccount}</Text>
        <View style={s.headerRight} />
      </View>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.flex} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[s.body, { width: CONTENT_W }]}>
            <View style={s.heroCard}>
              <View style={s.userRow}>
                <View style={s.avatar}>
                  <Ionicons name="person" size={32} color={TOKEN.accent} />
                </View>
                <View style={s.userInfo}>
                  <Text style={s.displayName}>{p.nameDisplay}</Text>
                  <Text style={s.emailMuted}>{p.emailLine}</Text>
                </View>
              </View>
            </View>

            <View style={s.sectionBlock}>
              <View style={s.sectionHead}>
                <View style={s.sectionAccent} />
                <Text style={s.sectionTitle}>{u.profileSection}</Text>
              </View>
              <View style={s.listCard}>
                <View style={s.listCardInner}>
                  <View style={s.listRow}>
                    <View style={s.listRowMain}>
                      <Text style={s.listRowLabel}>{u.nameLabel}</Text>
                      {p.editingField === 'name' ? (
                        <View style={s.profileFieldEdit}>
                          <TextInput
                            style={s.profileEditInput}
                            value={p.profileNameDraft}
                            onChangeText={p.setProfileNameDraft}
                            placeholder={u.namePlaceholder}
                            placeholderTextColor={TOKEN.inkMuted}
                            autoFocus
                            keyboardAppearance={p.keyboardAppearance}
                          />
                          <View style={s.profileEditActions}>
                            <Pressable style={s.profileEditActionBtn} onPress={p.cancelEdit}>
                              <Text style={s.profileEditActionCancel}>{u.cancel}</Text>
                            </Pressable>
                            <Pressable style={[s.profileEditActionBtn, s.profileEditActionPrimary]} onPress={p.saveName}>
                              <Text style={s.profileEditActionPrimaryText}>{u.save}</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <Pressable
                          style={s.listRowValueWrap}
                          onPress={p.startEditName}
                          accessibilityLabel={u.nameEditA11y}
                          accessibilityRole="button"
                        >
                          <Text style={s.listRowValue} numberOfLines={1}>
                            {p.nameDisplay}
                          </Text>
                          <Ionicons name="pencil-outline" size={18} color={TOKEN.inkMuted} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                  <View style={s.divider} />
                  <View style={s.listRow}>
                    <View style={[s.listRowMain, s.listRowHorizontal]}>
                      <Text style={s.listRowLabel}>{u.emailLabelRow}</Text>
                      <Text style={s.listRowValueMuted} numberOfLines={1}>
                        {p.emailLine}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={s.sectionBlock}>
              <View style={s.sectionHead}>
                <View style={s.sectionAccent} />
                <Text style={s.sectionTitle}>{u.securitySection}</Text>
              </View>
              <View style={s.listCard}>
                <View style={s.listCardInner}>
                  <Pressable
                    style={({ pressed }) => [s.listRow, s.listRowPressable, pressed && s.listRowPressed]}
                    onPress={() => {
                      p.setNewEmail('');
                      p.setEmailModalVisible(true);
                    }}
                    accessibilityLabel={u.changeEmailA11y}
                    accessibilityRole="button"
                  >
                    <View style={s.listRowMain}>
                      <Text style={s.listRowLabel}>{u.changeEmail}</Text>
                      <Text style={s.listRowCaption}>{u.changeEmailCaption}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={TOKEN.inkMuted} />
                  </Pressable>
                  <View style={s.divider} />
                  <Pressable
                    style={({ pressed }) => [s.listRow, s.listRowPressable, pressed && s.listRowPressed]}
                    onPress={() => {
                      p.setNewPassword('');
                      p.setNewPasswordConfirm('');
                      p.setPasswordModalVisible(true);
                    }}
                    accessibilityLabel={u.changePasswordA11y}
                    accessibilityRole="button"
                  >
                    <View style={s.listRowMain}>
                      <Text style={s.listRowLabel}>{u.changePassword}</Text>
                      <Text style={s.listRowCaption}>{u.changePasswordCaption}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={TOKEN.inkMuted} />
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={s.sectionBlock}>
              <View style={s.sectionHead}>
                <View style={[s.sectionAccent, s.sectionAccentDanger]} />
                <Text style={s.sectionTitle}>{u.deleteSectionTitle}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [s.dangerCard, pressed && s.listRowPressed]}
                onPress={p.confirmDeleteAccount}
                disabled={p.deleteAccountLoading}
                accessibilityLabel={u.deleteAccountA11y}
                accessibilityRole="button"
              >
                <View style={s.listCardInner}>
                  <View style={s.listRow}>
                    <Text style={s.dangerLabel}>{u.deleteRowLabel}</Text>
                    {p.deleteAccountLoading ? (
                      <ActivityIndicator size="small" color={TOKEN.danger} />
                    ) : (
                      <Ionicons name="trash-outline" size={22} color={TOKEN.danger} />
                    )}
                  </View>
                </View>
              </Pressable>
            </View>

            <View style={s.signOutBtnWrap}>
              <Pressable
                style={({ pressed }) => [s.signOutBtn, pressed && { opacity: 0.85 }]}
                onPress={p.onSignOut}
                accessibilityLabel={u.signOutA11y}
                accessibilityRole="button"
              >
                <Ionicons name="log-out-outline" size={20} color={TOKEN.ink} style={{ marginRight: 8 }} />
                <Text style={s.signOutBtnText}>{u.signOut}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={p.emailModalVisible} transparent animationType="fade" onRequestClose={() => p.setEmailModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => p.setEmailModalVisible(false)}>
          <View style={s.modalBackdrop} />
        </TouchableWithoutFeedback>
        <View style={s.modalCenter}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{u.modalChangeEmailTitle}</Text>
            <Text style={s.profileEditHint}>{u.modalChangeEmailHint}</Text>
            <TextInput
              style={s.profileEditInput}
              value={p.newEmail}
              onChangeText={p.setNewEmail}
              placeholder={u.emailPlaceholderNew}
              placeholderTextColor={TOKEN.inkMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!p.emailChangeLoading}
              keyboardAppearance={p.keyboardAppearance}
            />
            <View style={s.modalActions}>
              <Pressable style={s.modalActionBtn} onPress={() => p.setEmailModalVisible(false)} disabled={p.emailChangeLoading}>
                <Text style={s.profileEditActionCancel}>{u.cancel}</Text>
              </Pressable>
              <Pressable
                style={[s.modalActionBtn, s.profileEditActionPrimary]}
                onPress={() => void p.submitEmailChange()}
                disabled={p.emailChangeLoading}
              >
                {p.emailChangeLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.profileEditActionPrimaryText}>{u.modalSend}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={p.passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => p.setPasswordModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => p.setPasswordModalVisible(false)}>
          <View style={s.modalBackdrop} />
        </TouchableWithoutFeedback>
        <View style={s.modalCenter}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{u.modalChangePasswordTitle}</Text>
            <Text style={s.profileEditHint}>{u.modalPasswordHint}</Text>
            <TextInput
              style={s.profileEditInput}
              value={p.newPassword}
              onChangeText={p.setNewPassword}
              placeholder={u.newPasswordPlaceholder}
              placeholderTextColor={TOKEN.inkMuted}
              secureTextEntry
              editable={!p.passwordChangeLoading}
              keyboardAppearance={p.keyboardAppearance}
            />
            <TextInput
              style={[s.profileEditInput, { marginTop: 12 }]}
              value={p.newPasswordConfirm}
              onChangeText={p.setNewPasswordConfirm}
              placeholder={u.newPasswordConfirmPlaceholder}
              placeholderTextColor={TOKEN.inkMuted}
              secureTextEntry
              editable={!p.passwordChangeLoading}
              keyboardAppearance={p.keyboardAppearance}
            />
            <View style={s.modalActions}>
              <Pressable style={s.modalActionBtn} onPress={() => p.setPasswordModalVisible(false)} disabled={p.passwordChangeLoading}>
                <Text style={s.profileEditActionCancel}>{u.cancel}</Text>
              </Pressable>
              <Pressable
                style={[s.modalActionBtn, s.profileEditActionPrimary]}
                onPress={() => void p.submitPasswordChange()}
                disabled={p.passwordChangeLoading}
              >
                {p.passwordChangeLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.profileEditActionPrimaryText}>{u.modalChangeSubmit}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
