import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './client';
import { logger } from '../utils/logger';

export type AuthState = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
};

/**
 * 現在のセッションを取得
 */
export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    logger.warn('[Supabase Auth] getSession error:', error.message);
    return null;
  }
  return session;
}

/**
 * メール・パスワードでサインイン
 */
export async function signInWithPassword(email: string, password: string) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase が未設定です') };
  }
  return supabase.auth.signInWithPassword({ email, password });
}

/**
 * メール・パスワードで新規登録
 */
export async function signUpWithPassword(email: string, password: string) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase が未設定です') };
  }
  if (password.length < 6) {
    return { data: null, error: new Error('パスワードは6文字以上にしてください') };
  }
  if (!/[A-Z]/.test(password)) {
    return { data: null, error: new Error('パスワードに英大文字を1文字以上含めてください') };
  }
  return supabase.auth.signUp({ email, password });
}

/**
 * サインアウト
 */
export async function signOut() {
  if (!isSupabaseConfigured()) return;
  await supabase.auth.signOut();
}

/**
 * 認証状態の変更を購読（ログイン・ログアウト時にコールバックが呼ばれる）
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  if (!isSupabaseConfigured()) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => callback(event, session)
  );
  return () => subscription.unsubscribe();
}

/**
 * 現在のユーザー ID（ログイン済みなら UUID、未ログインなら null）
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

/**
 * Apple の ID トークンでサインイン（expo-apple-authentication で取得した identityToken を渡す）
 */
export async function signInWithApple(identityToken: string) {
  if (!isSupabaseConfigured()) {
    return { data: { user: null, session: null }, error: new Error('Supabase が未設定です') };
  }
  return supabase.auth.signInWithIdToken({ provider: 'apple', token: identityToken });
}

/**
 * Google OAuth の認証 URL を取得。この URL を WebBrowser.openAuthSessionAsync で開く。
 * リダイレクト後、アプリに戻った URL を setSessionFromRedirectUrl に渡す。
 */
export async function getGoogleOAuthUrl(redirectUrl: string) {
  if (!isSupabaseConfigured()) {
    return { url: null, error: new Error('Supabase が未設定です') };
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
  });
  if (error) return { url: null, error };
  return { url: data?.url ?? null, error: null };
}

/**
 * OAuth リダイレクト後の URL（ハッシュ付き）からセッションを復元する。
 * 例: kla://auth/callback#access_token=xxx&refresh_token=yyy
 */
export async function setSessionFromRedirectUrl(url: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase が未設定です') };
  }
  const hash = url.includes('#') ? url.split('#')[1] : '';
  if (!hash) return { error: new Error('URL にトークンが含まれていません') };
  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) {
    return { error: new Error('access_token または refresh_token がありません') };
  }
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  return { error: error ?? null };
}

/**
 * ログイン中のユーザーのメールアドレスを変更する。
 * Supabase の「Secure email change」が有効な場合、新旧両方のメールに確認リンクが送られます。
 */
export async function updateUserEmail(newEmail: string) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase が未設定です') };
  }
  const trimmed = newEmail.trim();
  if (!trimmed) return { data: null, error: new Error('メールアドレスを入力してください') };
  return supabase.auth.updateUser({ email: trimmed });
}

/**
 * ログイン中のユーザーのパスワードを変更する（メールでサインアップしたユーザー向け）。
 * OAuth のみのユーザーも、これでパスワードを設定するとメールログインが可能になります。
 * 「Secure password change」が有効な場合は、直近 24 時間以内にログインしていないと再認証が必要になる場合があります。
 */
export async function updateUserPassword(newPassword: string) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase が未設定です') };
  }
  if (newPassword.length < 6) return { data: null, error: new Error('パスワードは6文字以上にしてください') };
  if (!/[A-Z]/.test(newPassword)) {
    return { data: null, error: new Error('パスワードに英大文字を1文字以上含めてください') };
  }
  return supabase.auth.updateUser({ password: newPassword });
}

/** Edge Function 名（アカウント自己削除用）。 */
const DELETE_USER_FUNCTION_NAME = 'delete-user';

function normalizeDeleteAccountError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/404|not found|FunctionsHttpError|Failed to send a request/i.test(message)) {
    return new Error('アカウント削除の設定がまだ完了していません。しばらくしてから再度お試しください。');
  }
  if (/401|403|unauthorized|forbidden/i.test(message)) {
    return new Error('削除を実行する権限を確認できませんでした。もう一度ログインしてお試しください。');
  }
  return new Error(message || 'アカウント削除に失敗しました。');
}

/**
 * アカウントを削除する。Supabase Edge Function（delete-user）を呼び出します。
 * Edge Function 側で service role を使って auth.admin.deleteUser(uid) を実行する実装が必要です。
 * 成功時はクライアントで signOut を呼んでください。
 */
export async function deleteAccount(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase が未設定です') };
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: new Error('ログインしていません') };
  const { data, error } = await supabase.functions.invoke(DELETE_USER_FUNCTION_NAME, {
    body: {},
  });
  if (error) return { error: normalizeDeleteAccountError(error) };
  if (data?.error) return { error: normalizeDeleteAccountError(data.error) };
  return { error: null };
}
