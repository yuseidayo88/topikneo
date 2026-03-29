/**
 * アカウント画面 - 未ログイン時はログイン、ログイン済みはプロフィール概要・編集・ログアウトを一括表示（案A）
 * Supabase Dashboard で Apple と Google プロバイダーを有効にし、リダイレクト URL に kla://auth/callback を追加してください。
 */
import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { triggerLightImpact } from '@/src/utils/haptics';
import { useAuthStore } from '@/src/store/authStore';
import { useProfileStore } from '@/src/store/profileStore';
import { useSubscriptionStore } from '@/src/store/subscriptionStore';
import * as db from '@/src/db/database';
import { getSettingsFlowTokens } from '@/src/theme/settingsFlowTokens';
import {
  signInWithApple,
  getGoogleOAuthUrl,
  setSessionFromRedirectUrl,
  signOut,
  signInWithPassword,
  signUpWithPassword,
  updateUserEmail,
  updateUserPassword,
  deleteAccount,
} from '@/src/supabase/auth';
import { isSupabaseConfigured } from '@/src/supabase/client';
import { getLoginStrings, getLoginUiStrings } from '@/src/i18n/login';
import { AUTH_CALLBACK_SCHEME } from '@/src/features/login/loginConstants';
import { makeLoginStyles } from '@/src/features/login/loginStyles';
import { LoggedInAccountView } from '@/src/features/login/LoggedInAccountView';
import { SignInView } from '@/src/features/login/SignInView';

export default function LoginScreen() {
  const hasUppercase = useCallback((value: string) => /[A-Z]/.test(value), []);
  const router = useRouter();
  const { headerPaddingTop } = useSafeArea();
  const { resolvedMode } = useTheme();
  const { flowShadow: SHADOW } = useThemeStyles();
  const keyboardAppearance = resolvedMode === 'dark' ? 'dark' : 'light';
  const TOKEN = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const s = useMemo(() => makeLoginStyles(TOKEN, SHADOW, resolvedMode), [TOKEN, SHADOW, resolvedMode]);
  const user = useAuthStore((st) => st.user);
  const isLoading = useAuthStore((st) => st.isLoading);
  const loadError = useAuthStore((st) => st.loadError);
  const load = useAuthStore((st) => st.load);
  const loadProfile = useProfileStore((st) => st.load);
  const saveProfile = useProfileStore((st) => st.save);
  const clearProfile = useProfileStore((st) => st.clear);
  const clearSubscriptionState = useSubscriptionStore((st) => st.clearLocalState);
  const profileName = useProfileStore((st) => st.name);
  const displayLanguage = useProfileStore((st) => st.displayLanguage);
  const loginLocale = displayLanguage;
  const lt = useMemo(() => getLoginStrings(loginLocale), [loginLocale]);
  const ui = useMemo(() => getLoginUiStrings(loginLocale), [loginLocale]);

  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [editingField, setEditingField] = useState<'name' | null>(null);
  const [profileNameDraft, setProfileNameDraft] = useState('');
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  const handleDeepLink = useCallback(
    async (url: string) => {
      if (!url.startsWith(AUTH_CALLBACK_SCHEME)) return;
      setGoogleLoading(true);
      const { error } = await setSessionFromRedirectUrl(url);
      setGoogleLoading(false);
      if (error) {
        Alert.alert(lt.loginFailed, error.message);
      } else {
        await load();
      }
    },
    [load, lt]
  );

  useEffect(() => {
    const sub = Linking.addEventListener('url', (e) => handleDeepLink(e.url));
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    return () => sub.remove();
  }, [handleDeepLink]);

  useEffect(() => {
    if (user) void loadProfile();
  }, [user, loadProfile]);

  const startEditName = useCallback(() => {
    setProfileNameDraft(profileName);
    setEditingField('name');
  }, [profileName]);

  const saveName = useCallback(async () => {
    await saveProfile({ name: profileNameDraft.trim() || profileName });
    setEditingField(null);
    await loadProfile();
  }, [profileNameDraft, profileName, saveProfile, loadProfile]);

  const cancelEdit = useCallback(() => {
    setEditingField(null);
  }, []);

  const submitEmailChange = useCallback(async () => {
    const v = newEmail.trim();
    if (!v) {
      Alert.alert(lt.enterTitle, lt.enterNewEmail);
      return;
    }
    setEmailChangeLoading(true);
    const { error } = await updateUserEmail(v);
    setEmailChangeLoading(false);
    if (error) {
      Alert.alert(lt.changeFailed, error.message);
      return;
    }
    setEmailModalVisible(false);
    setNewEmail('');
    Alert.alert(lt.emailSentTitle, lt.emailSentBody);
    await load();
  }, [newEmail, load, lt]);

  const submitPasswordChange = useCallback(async () => {
    if (newPassword.length < 6) {
      Alert.alert(lt.passwordShortTitle, lt.passwordShortBody);
      return;
    }
    if (!hasUppercase(newPassword)) {
      Alert.alert(lt.passwordUppercaseTitle, lt.passwordUppercaseBody);
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      Alert.alert(lt.passwordMismatchTitle, lt.passwordMismatchBody);
      return;
    }
    setPasswordChangeLoading(true);
    const { error } = await updateUserPassword(newPassword);
    setPasswordChangeLoading(false);
    if (error) {
      Alert.alert(lt.changeFailed, error.message);
      return;
    }
    setPasswordModalVisible(false);
    setNewPassword('');
    setNewPasswordConfirm('');
    Alert.alert(lt.passwordChangedTitle, '');
  }, [newPassword, newPasswordConfirm, lt, hasUppercase]);

  const confirmDeleteAccount = useCallback(() => {
    Alert.alert(lt.deleteAccountTitle, lt.deleteAccountMessage, [
      { text: lt.cancel, style: 'cancel' },
      {
        text: lt.deleteAction,
        style: 'destructive',
        onPress: async () => {
          setDeleteAccountLoading(true);
          const { error } = await deleteAccount();
          setDeleteAccountLoading(false);
          if (error) {
            Alert.alert(lt.deleteFailed, error.message);
            return;
          }
          await clearProfile();
          await clearSubscriptionState();
          db.resetAllData();
          await signOut().catch(() => {});
          await load().catch(() => {});
          Alert.alert(lt.accountDeletedTitle, '');
        },
      },
    ]);
  }, [load, lt, clearProfile, clearSubscriptionState]);

  const onApple = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      Alert.alert(lt.unavailableTitle, lt.configureSupabase);
      return;
    }
    setAppleLoading(true);
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const token = cred.identityToken;
      if (!token) {
        Alert.alert(lt.signInCancelledTitle, '');
        return;
      }
      const { data, error } = await signInWithApple(token);
      if (error) {
        Alert.alert(lt.loginFailed, error.message);
        return;
      }
      if (data?.session) await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'ERR_REQUEST_CANCELED' || msg.includes('cancel')) {
        return;
      }
      Alert.alert(lt.errorTitle, msg || lt.appleLoginFailedFallback);
    } finally {
      setAppleLoading(false);
    }
  }, [load, lt]);

  const onGoogle = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      Alert.alert(lt.unavailableTitle, lt.configureSupabase);
      return;
    }
    setGoogleLoading(true);
    try {
      const { url, error } = await getGoogleOAuthUrl(AUTH_CALLBACK_SCHEME);
      if (error || !url) {
        Alert.alert(lt.loginFailed, error?.message ?? lt.urlFetchFailed);
        setGoogleLoading(false);
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(url, AUTH_CALLBACK_SCHEME);
      if (result.type === 'success' && result.url) {
        const { error: sessionError } = await setSessionFromRedirectUrl(result.url);
        if (sessionError) {
          Alert.alert(lt.loginFailed, sessionError.message);
        } else {
          await load();
        }
      }
    } catch (e) {
      Alert.alert(lt.errorTitle, e instanceof Error ? e.message : lt.googleLoginFailed);
    } finally {
      setGoogleLoading(false);
    }
  }, [load, lt]);

  const onSignOut = useCallback(async () => {
    await signOut();
    await load();
  }, [load]);

  const onEmailSubmit = useCallback(async () => {
    const trimEmail = email.trim();
    const trimPassword = password.trim();
    if (!trimEmail || !trimPassword) {
      Alert.alert(lt.enterTitle, lt.enterEmailPassword);
      return;
    }
    if (trimPassword.length < 6) {
      Alert.alert(lt.passwordShortTitle, lt.passwordShortBody);
      return;
    }
    if (isSignUp && !hasUppercase(trimPassword)) {
      Alert.alert(lt.passwordUppercaseTitle, lt.passwordUppercaseBody);
      return;
    }
    setEmailLoading(true);
    try {
      const { data, error } = isSignUp
        ? await signUpWithPassword(trimEmail, trimPassword)
        : await signInWithPassword(trimEmail, trimPassword);
      if (error) {
        Alert.alert(isSignUp ? lt.signUpFailed : lt.signInFailed, error.message);
        return;
      }
      if (data?.session) await load();
      if (isSignUp && data?.user && !data.session) {
        Alert.alert(lt.verificationEmailSentTitle, lt.verificationEmailSentBody);
      }
    } finally {
      setEmailLoading(false);
    }
  }, [email, password, isSignUp, load, lt, hasUppercase]);

  if (!isSupabaseConfigured()) {
    return (
      <View style={[s.container, { paddingTop: headerPaddingTop }]}>
        <LinearGradient colors={[TOKEN.bg, TOKEN.bgEnd]} style={StyleSheet.absoluteFill} />
        <View style={s.center}>
          <Text style={s.hint}>{lt.notConfiguredScreen}</Text>
          <Pressable
            style={s.backBtn}
            onPress={() => {
              void triggerLightImpact();
              router.back();
            }}
            accessibilityLabel={lt.backA11y}
            accessibilityRole="button"
          >
            <Text style={s.backBtnText}>{lt.back}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[s.container, s.center, { paddingTop: headerPaddingTop }]}>
        <LinearGradient colors={[TOKEN.bg, TOKEN.bgEnd]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={TOKEN.accent} />
      </View>
    );
  }

  if (user) {
    const nameDisplay =
      (profileName && profileName.trim()) ||
      (user.user_metadata?.full_name as string | undefined) ||
      (user.email ?? (user.user_metadata?.email as string | undefined)) ||
      ui.notSet;
    const emailLine = user.email ?? (user.user_metadata?.email as string | undefined) ?? ui.emailDash;

    return (
      <LoggedInAccountView
        ui={ui}
        headerPaddingTop={headerPaddingTop}
        keyboardAppearance={keyboardAppearance}
        onBack={() => router.back()}
        styles={s}
        token={TOKEN}
        nameDisplay={nameDisplay}
        emailLine={emailLine}
        editingField={editingField}
        profileNameDraft={profileNameDraft}
        setProfileNameDraft={setProfileNameDraft}
        startEditName={startEditName}
        saveName={saveName}
        cancelEdit={cancelEdit}
        emailModalVisible={emailModalVisible}
        setEmailModalVisible={setEmailModalVisible}
        newEmail={newEmail}
        setNewEmail={setNewEmail}
        submitEmailChange={submitEmailChange}
        emailChangeLoading={emailChangeLoading}
        passwordModalVisible={passwordModalVisible}
        setPasswordModalVisible={setPasswordModalVisible}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        newPasswordConfirm={newPasswordConfirm}
        setNewPasswordConfirm={setNewPasswordConfirm}
        submitPasswordChange={submitPasswordChange}
        passwordChangeLoading={passwordChangeLoading}
        confirmDeleteAccount={confirmDeleteAccount}
        deleteAccountLoading={deleteAccountLoading}
        onSignOut={onSignOut}
      />
    );
  }

  return (
    <SignInView
      ui={ui}
      headerPaddingTop={headerPaddingTop}
      keyboardAppearance={keyboardAppearance}
      onBack={() => router.back()}
      styles={s}
      token={TOKEN}
      loadError={loadError}
      onRetryLoad={() => load()}
      appleLoading={appleLoading}
      googleLoading={googleLoading}
      onApple={onApple}
      onGoogle={onGoogle}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      passwordVisible={passwordVisible}
      setPasswordVisible={setPasswordVisible}
      isSignUp={isSignUp}
      setIsSignUp={setIsSignUp}
      emailLoading={emailLoading}
      onEmailSubmit={onEmailSubmit}
    />
  );
}
