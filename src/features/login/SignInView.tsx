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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { triggerLightImpact } from '@/src/utils/haptics';
import type { LoginStyles, LoginToken } from '@/src/features/login/loginStyles';
import type { LoginUiStrings } from '@/src/i18n/login';

export type SignInViewProps = {
  ui: LoginUiStrings;
  headerPaddingTop: number;
  keyboardAppearance: 'light' | 'dark';
  onBack: () => void;
  styles: LoginStyles;
  token: LoginToken;
  loadError: string | null;
  onRetryLoad: () => void;
  appleLoading: boolean;
  googleLoading: boolean;
  onApple: () => Promise<void>;
  onGoogle: () => Promise<void>;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  passwordVisible: boolean;
  setPasswordVisible: (v: boolean | ((prev: boolean) => boolean)) => void;
  isSignUp: boolean;
  setIsSignUp: (v: boolean | ((prev: boolean) => boolean)) => void;
  emailLoading: boolean;
  onEmailSubmit: () => Promise<void>;
};

export function SignInView(p: SignInViewProps) {
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
        <Text style={s.title}>{u.screenTitleSignIn}</Text>
        <View style={s.headerRight} />
      </View>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.flex} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={s.body}>
            {p.loadError ? (
              <View style={s.authErrorBlock}>
                <Text style={s.authErrorText}>{p.loadError}</Text>
                <Pressable
                  style={({ pressed }) => [s.authErrorRetry, pressed && { opacity: 0.9 }]}
                  onPress={p.onRetryLoad}
                  accessibilityLabel={u.retry}
                  accessibilityRole="button"
                >
                  <Text style={s.authErrorRetryText}>{u.retry}</Text>
                </Pressable>
              </View>
            ) : null}
            <Text style={s.subtitle}>{u.subtitleSync}</Text>

            {Platform.OS === 'ios' && (
              <Pressable
                style={({ pressed }) => [s.socialBtn, s.appleBtn, pressed && { opacity: 0.9 }]}
                onPress={p.onApple}
                disabled={p.appleLoading}
                accessibilityLabel={u.appleLoginA11y}
                accessibilityRole="button"
              >
                {p.appleLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={22} color="#FFF" />
                    <Text style={s.socialBtnText}>{u.appleContinue}</Text>
                  </>
                )}
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [s.socialBtn, s.googleBtn, pressed && { opacity: 0.9 }]}
              onPress={p.onGoogle}
              disabled={p.googleLoading}
              accessibilityLabel={u.googleLoginA11y}
              accessibilityRole="button"
            >
              {p.googleLoading ? (
                <ActivityIndicator color={TOKEN.ink} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={22} color={TOKEN.ink} />
                  <Text style={[s.socialBtnText, s.googleBtnText]}>{u.googleContinue}</Text>
                </>
              )}
            </Pressable>

            <View style={s.dividerWrap}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>{u.dividerOr}</Text>
              <View style={s.dividerLine} />
            </View>

            <View style={s.emailForm}>
              <Text style={s.inputLabel}>{u.emailLabel}</Text>
              <TextInput
                style={s.input}
                placeholder={u.emailPlaceholder}
                placeholderTextColor={TOKEN.inkMuted}
                value={p.email}
                onChangeText={p.setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!p.emailLoading}
                keyboardAppearance={p.keyboardAppearance}
              />
              <Text style={[s.inputLabel, { marginTop: 12 }]}>{u.passwordLabel}</Text>
              <View style={s.passwordInputWrap}>
                <TextInput
                  style={s.passwordInput}
                  placeholder={p.isSignUp ? u.passwordPlaceholderSignUp : u.passwordPlaceholderSignIn}
                  placeholderTextColor={TOKEN.inkMuted}
                  value={p.password}
                  onChangeText={p.setPassword}
                  secureTextEntry={!p.passwordVisible}
                  editable={!p.emailLoading}
                  keyboardAppearance={p.keyboardAppearance}
                />
                <Pressable
                  style={s.passwordEyeBtn}
                  onPress={() => p.setPasswordVisible((v) => !v)}
                  accessibilityLabel={p.passwordVisible ? u.passwordHideA11y : u.passwordShowA11y}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={p.passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={TOKEN.inkMuted}
                  />
                </Pressable>
              </View>
              <Pressable
                style={({ pressed }) => [s.emailSubmitBtn, pressed && { opacity: 0.9 }]}
                onPress={p.onEmailSubmit}
                disabled={p.emailLoading}
                accessibilityLabel={p.isSignUp ? u.emailSubmitSignUpA11y : u.emailSubmitSignInA11y}
                accessibilityRole="button"
              >
                {p.emailLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={s.socialBtnText}>{p.isSignUp ? u.emailSubmitSignUp : u.emailSubmitSignIn}</Text>
                )}
              </Pressable>
              <Pressable
                style={s.toggleWrap}
                onPress={() => p.setIsSignUp((v) => !v)}
                accessibilityLabel={p.isSignUp ? u.toggleToSignInA11y : u.toggleToSignUpA11y}
                accessibilityRole="button"
              >
                <Text style={s.toggleText}>
                  {p.isSignUp ? u.toggleToSignIn : u.toggleToSignUp}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
