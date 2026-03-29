/**
 * authStore の単体テスト。getSession / isSupabaseConfigured をモックする。
 */
import { useAuthStore } from '../store/authStore';

const mockUser = { id: 'user-1', email: 'test@example.com' } as any;
const mockSession = { user: mockUser } as any;

jest.mock('../supabase/client', () => ({
  isSupabaseConfigured: jest.fn(() => true),
}));

jest.mock('../supabase/auth', () => ({
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(() => () => {}),
}));

jest.mock('../supabase/progressSync', () => ({
  initializeSupabaseProgressSync: jest.fn().mockResolvedValue(undefined),
  resetToLocalProgressMode: jest.fn(),
}));

jest.mock('../revenuecat/config', () => ({
  isRevenueCatConfigured: () => false,
}));

jest.mock('../revenuecat/client', () => ({
  syncRevenueCatIdentity: jest.fn().mockResolvedValue(null),
}));

jest.mock('../store/progressStore', () => ({
  useProgressStore: {
    getState: jest.fn(() => ({ refresh: jest.fn(), bumpAfterLocalDbMutation: jest.fn() })),
  },
}));

const { isSupabaseConfigured } = require('../supabase/client');
const { getSession } = require('../supabase/auth');

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    user: null,
    session: null,
    isLoading: false,
    loadError: null,
  });
});

describe('authStore', () => {
  it('初期状態が期待どおり', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.loadError).toBeNull();
  });

  it('isSupabaseConfigured が false のとき load で user/session が null になり isLoading が false', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    await useAuthStore.getState().load();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.loadError).toBeNull();
    expect(getSession).not.toHaveBeenCalled();
  });

  it('getSession が成功すると session / user が設定され loadError が null', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
    (getSession as jest.Mock).mockResolvedValue(mockSession);
    await useAuthStore.getState().load();
    const state = useAuthStore.getState();
    expect(state.session).toEqual(mockSession);
    expect(state.user).toEqual(mockUser);
    expect(state.isLoading).toBe(false);
    expect(state.loadError).toBeNull();
  });

  it('getSession が失敗すると loadError にメッセージが入る', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
    (getSession as jest.Mock).mockRejectedValue(new Error('Auth error'));
    await useAuthStore.getState().load();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.loadError).toBe('Auth error');
  });
});
