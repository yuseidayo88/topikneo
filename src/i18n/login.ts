/**
 * ログイン / アカウント画面の Alert 文言（AppLocale）
 */
import type { AppLocale } from './appLocale';
import { FALLBACK_APP_LOCALE } from './appLocale';

export type LoginLocale = AppLocale;

export type LoginStrings = {
  loginFailed: string;
  enterTitle: string;
  enterNewEmail: string;
  enterEmailPassword: string;
  changeFailed: string;
  emailSentTitle: string;
  emailSentBody: string;
  passwordShortTitle: string;
  passwordShortBody: string;
  passwordUppercaseTitle: string;
  passwordUppercaseBody: string;
  passwordMismatchTitle: string;
  passwordMismatchBody: string;
  passwordChangedTitle: string;
  deleteAccountTitle: string;
  deleteAccountMessage: string;
  cancel: string;
  deleteAction: string;
  deleteFailed: string;
  accountDeletedTitle: string;
  unavailableTitle: string;
  configureSupabase: string;
  signInCancelledTitle: string;
  errorTitle: string;
  appleLoginFailedFallback: string;
  googleLoginFailed: string;
  urlFetchFailed: string;
  signUpFailed: string;
  signInFailed: string;
  verificationEmailSentTitle: string;
  verificationEmailSentBody: string;
  notConfiguredScreen: string;
  backA11y: string;
  back: string;
};

const loginJa: LoginStrings = {
  loginFailed: 'ログインに失敗しました',
  enterTitle: '入力してください',
  enterNewEmail: '新しいメールアドレスを入力してください。',
  enterEmailPassword: 'メールアドレスとパスワードを入力してください。',
  changeFailed: '変更に失敗しました',
  emailSentTitle: '確認メールを送信しました',
  emailSentBody: '新しいメールアドレスに届いたリンクを開いて確認すると変更が反映されます。',
  passwordShortTitle: 'パスワードが短いです',
  passwordShortBody: '6文字以上で入力してください。',
  passwordUppercaseTitle: 'パスワードの条件を満たしていません',
  passwordUppercaseBody: '英大文字を1文字以上含めてください。',
  passwordMismatchTitle: 'パスワードが一致しません',
  passwordMismatchBody: '確認用にもう一度入力してください。',
  passwordChangedTitle: 'パスワードを変更しました',
  deleteAccountTitle: 'アカウントを削除',
  deleteAccountMessage: '削除するとログイン情報やアプリ内のデータは復元できません。本当に削除しますか？',
  cancel: 'キャンセル',
  deleteAction: '削除する',
  deleteFailed: '削除に失敗しました',
  accountDeletedTitle: 'アカウントを削除しました',
  unavailableTitle: '利用できません',
  configureSupabase: 'Supabase を設定してください。',
  signInCancelledTitle: 'サインインをキャンセルしました',
  errorTitle: 'エラー',
  appleLoginFailedFallback: 'Apple ログインに失敗しました',
  googleLoginFailed: 'Google ログインに失敗しました',
  urlFetchFailed: 'URL を取得できませんでした',
  signUpFailed: '登録に失敗しました',
  signInFailed: 'ログインに失敗しました',
  verificationEmailSentTitle: '確認メールを送りました',
  verificationEmailSentBody: 'メール内のリンクで確認するとログインできます。',
  notConfiguredScreen: 'ログインは Supabase 設定後に利用できます',
  backA11y: '戻る',
  back: '戻る',
};

const loginEn: LoginStrings = {
  loginFailed: 'Sign-in failed',
  enterTitle: 'Required',
  enterNewEmail: 'Enter a new email address.',
  enterEmailPassword: 'Enter your email and password.',
  changeFailed: 'Update failed',
  emailSentTitle: 'Confirmation email sent',
  emailSentBody: 'Open the link in the new inbox to confirm the change.',
  passwordShortTitle: 'Password too short',
  passwordShortBody: 'Use at least 6 characters.',
  passwordUppercaseTitle: 'Password requirements not met',
  passwordUppercaseBody: 'Include at least one uppercase letter.',
  passwordMismatchTitle: 'Passwords do not match',
  passwordMismatchBody: 'Re-enter the confirmation password.',
  passwordChangedTitle: 'Password updated',
  deleteAccountTitle: 'Delete account',
  deleteAccountMessage:
    'This cannot be undone. Your login and app data cannot be recovered. Delete anyway?',
  cancel: 'Cancel',
  deleteAction: 'Delete',
  deleteFailed: 'Could not delete account',
  accountDeletedTitle: 'Account deleted',
  unavailableTitle: 'Unavailable',
  configureSupabase: 'Configure Supabase to use sign-in.',
  signInCancelledTitle: 'Sign-in cancelled',
  errorTitle: 'Error',
  appleLoginFailedFallback: 'Apple sign-in failed',
  googleLoginFailed: 'Google sign-in failed',
  urlFetchFailed: 'Could not get URL',
  signUpFailed: 'Sign-up failed',
  signInFailed: 'Sign-in failed',
  verificationEmailSentTitle: 'Verification email sent',
  verificationEmailSentBody: 'Open the link in the email to verify and sign in.',
  notConfiguredScreen: 'Sign-in is available after Supabase is configured',
  backA11y: 'Back',
  back: 'Back',
};

const loginMaps: Record<AppLocale, LoginStrings> = {
  ja: loginJa,
  en: loginEn,
  zh: loginEn,
  vi: loginEn,
  es: loginEn,
  id: loginEn,
  th: loginEn,
};

export function getLoginStrings(locale: LoginLocale = 'ja'): LoginStrings {
  return loginMaps[locale] ?? loginMaps[FALLBACK_APP_LOCALE];
}

/** ログイン / アカウント画面のラベル・ボタン文言（Alert は LoginStrings） */
export type LoginUiStrings = {
  screenTitleSignIn: string;
  screenTitleAccount: string;
  retry: string;
  backA11y: string;
  subtitleSync: string;
  appleLoginA11y: string;
  appleContinue: string;
  googleLoginA11y: string;
  googleContinue: string;
  dividerOr: string;
  emailLabel: string;
  passwordLabel: string;
  passwordPlaceholderSignUp: string;
  passwordPlaceholderSignIn: string;
  emailPlaceholder: string;
  emailSubmitSignUp: string;
  emailSubmitSignIn: string;
  emailSubmitSignUpA11y: string;
  emailSubmitSignInA11y: string;
  toggleToSignIn: string;
  toggleToSignUp: string;
  toggleToSignInA11y: string;
  toggleToSignUpA11y: string;
  passwordShowA11y: string;
  passwordHideA11y: string;
  profileSection: string;
  nameLabel: string;
  namePlaceholder: string;
  nameEditA11y: string;
  cancel: string;
  save: string;
  emailLabelRow: string;
  securitySection: string;
  changeEmail: string;
  changeEmailCaption: string;
  changePassword: string;
  changePasswordCaption: string;
  changeEmailA11y: string;
  changePasswordA11y: string;
  deleteSectionTitle: string;
  deleteRowLabel: string;
  deleteAccountA11y: string;
  signOut: string;
  signOutA11y: string;
  modalChangeEmailTitle: string;
  modalChangeEmailHint: string;
  modalSend: string;
  emailPlaceholderNew: string;
  modalChangePasswordTitle: string;
  modalPasswordHint: string;
  newPasswordPlaceholder: string;
  newPasswordConfirmPlaceholder: string;
  modalChangeSubmit: string;
  notSet: string;
  emailDash: string;
};

const loginUiJa: LoginUiStrings = {
  screenTitleSignIn: 'ログイン',
  screenTitleAccount: 'アカウント',
  retry: '再試行',
  backA11y: '戻る',
  subtitleSync: 'アカウントでログインすると、進捗を同期できます',
  appleLoginA11y: 'Apple でログイン',
  appleContinue: 'Apple で続ける',
  googleLoginA11y: 'Google でログイン',
  googleContinue: 'Google で続ける',
  dividerOr: 'または',
  emailLabel: 'メールアドレス',
  passwordLabel: 'パスワード',
  passwordPlaceholderSignUp: '6文字以上・英大文字1文字以上',
  passwordPlaceholderSignIn: 'パスワード',
  emailPlaceholder: 'example@email.com',
  emailSubmitSignUp: 'アカウントを作成',
  emailSubmitSignIn: 'メールでログイン',
  emailSubmitSignUpA11y: 'アカウントを作成',
  emailSubmitSignInA11y: 'ログイン',
  toggleToSignIn: 'すでにアカウントがある方はログイン',
  toggleToSignUp: 'アカウントを作成',
  toggleToSignInA11y: 'すでにアカウントがある方はログイン',
  toggleToSignUpA11y: 'アカウントを作成',
  passwordShowA11y: 'パスワードを表示',
  passwordHideA11y: 'パスワードを隠す',
  profileSection: 'プロフィール',
  nameLabel: '名前',
  namePlaceholder: '名前を入力',
  nameEditA11y: '名前を編集',
  cancel: 'キャンセル',
  save: '保存',
  emailLabelRow: 'メールアドレス',
  securitySection: 'セキュリティ',
  changeEmail: 'メールアドレスを変更',
  changeEmailCaption: '確認メールで変更',
  changePassword: 'パスワードを変更',
  changePasswordCaption: '新しいパスワードを設定',
  changeEmailA11y: 'メールアドレスを変更。確認メールで変更',
  changePasswordA11y: 'パスワードを変更。新しいパスワードを設定',
  deleteSectionTitle: 'アカウントを削除',
  deleteRowLabel: '削除する',
  deleteAccountA11y: 'アカウントを削除',
  signOut: 'ログアウト',
  signOutA11y: 'ログアウト',
  modalChangeEmailTitle: 'メールアドレスを変更',
  modalChangeEmailHint: '新しいメールアドレスに確認リンクが送られます',
  modalSend: '送信',
  emailPlaceholderNew: 'new@example.com',
  modalChangePasswordTitle: 'パスワードを変更',
  modalPasswordHint: '6文字以上・英大文字1文字以上',
  newPasswordPlaceholder: '新しいパスワード',
  newPasswordConfirmPlaceholder: '確認用（もう一度）',
  modalChangeSubmit: '変更する',
  notSet: '未設定',
  emailDash: '—',
};

const loginUiEn: LoginUiStrings = {
  screenTitleSignIn: 'Sign in',
  screenTitleAccount: 'Account',
  retry: 'Retry',
  backA11y: 'Back',
  subtitleSync: 'Sign in to sync your progress across devices',
  appleLoginA11y: 'Sign in with Apple',
  appleContinue: 'Continue with Apple',
  googleLoginA11y: 'Sign in with Google',
  googleContinue: 'Continue with Google',
  dividerOr: 'or',
  emailLabel: 'Email',
  passwordLabel: 'Password',
  passwordPlaceholderSignUp: 'At least 6 chars, 1 uppercase',
  passwordPlaceholderSignIn: 'Password',
  emailPlaceholder: 'example@email.com',
  emailSubmitSignUp: 'Create account',
  emailSubmitSignIn: 'Sign in with email',
  emailSubmitSignUpA11y: 'Create account',
  emailSubmitSignInA11y: 'Sign in',
  toggleToSignIn: 'Already have an account? Sign in',
  toggleToSignUp: 'Create an account',
  toggleToSignInA11y: 'Already have an account? Sign in',
  toggleToSignUpA11y: 'Create an account',
  passwordShowA11y: 'Show password',
  passwordHideA11y: 'Hide password',
  profileSection: 'Profile',
  nameLabel: 'Name',
  namePlaceholder: 'Enter your name',
  nameEditA11y: 'Edit name',
  cancel: 'Cancel',
  save: 'Save',
  emailLabelRow: 'Email',
  securitySection: 'Security',
  changeEmail: 'Change email',
  changeEmailCaption: 'Via confirmation email',
  changePassword: 'Change password',
  changePasswordCaption: 'Set a new password',
  changeEmailA11y: 'Change email. Confirmation link will be sent',
  changePasswordA11y: 'Change password. Set a new password',
  deleteSectionTitle: 'Delete account',
  deleteRowLabel: 'Delete',
  deleteAccountA11y: 'Delete account',
  signOut: 'Sign out',
  signOutA11y: 'Sign out',
  modalChangeEmailTitle: 'Change email',
  modalChangeEmailHint: 'A confirmation link will be sent to the new address',
  modalSend: 'Send',
  emailPlaceholderNew: 'new@example.com',
  modalChangePasswordTitle: 'Change password',
  modalPasswordHint: 'At least 6 chars, 1 uppercase',
  newPasswordPlaceholder: 'New password',
  newPasswordConfirmPlaceholder: 'Confirm password',
  modalChangeSubmit: 'Update',
  notSet: 'Not set',
  emailDash: '—',
};

const loginUiMaps: Record<AppLocale, LoginUiStrings> = {
  ja: loginUiJa,
  en: loginUiEn,
  zh: loginUiEn,
  vi: loginUiEn,
  es: loginUiEn,
  id: loginUiEn,
  th: loginUiEn,
};

export function getLoginUiStrings(locale: LoginLocale = 'ja'): LoginUiStrings {
  return loginUiMaps[locale] ?? loginUiMaps[FALLBACK_APP_LOCALE];
}
