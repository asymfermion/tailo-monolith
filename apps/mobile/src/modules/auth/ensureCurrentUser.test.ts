import {
  getAuthAccessToken,
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';
import { secureStorage } from '@/modules/auth/secureStorage';
import {
  APP_USER_ID_KEY,
  clearTailoAppUserIdCache,
  ensureCurrentUserIfNeeded,
  getTailoAppUserId,
} from './ensureCurrentUser';

jest.mock('@/lib/env', () => ({
  appEnv: {
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon-key',
  },
}));

jest.mock('@/modules/auth/authService', () => ({
  isRemoteAuthConfigured: jest.fn(),
  getAuthSession: jest.fn(),
  getAuthAccessToken: jest.fn(),
}));

jest.mock('@/modules/auth/secureStorage', () => ({
  secureStorage: {
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
  },
}));

describe('ensureCurrentUserIfNeeded', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
    void clearTailoAppUserIdCache();
  });

  it('skips when remote auth is not configured', async () => {
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(false);

    await expect(ensureCurrentUserIfNeeded()).resolves.toEqual({
      status: 'skipped',
    });
  });

  it('ensures app user id and caches it', async () => {
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(true);
    jest.mocked(getAuthSession).mockResolvedValue({
      userId: 'user-1',
      isAnonymous: true,
      email: null,
      emailConfirmed: false,
    });
    jest.mocked(getAuthAccessToken).mockResolvedValue('token-abc');
    jest.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        app_user_id: 'app-user-1',
        user_id: 'user-1',
        created_app_user: true,
        created_supabase_identity: true,
        created_email_identity: false,
      }),
    } as Response);

    await expect(ensureCurrentUserIfNeeded()).resolves.toEqual({
      status: 'ensured',
      response: {
        app_user_id: 'app-user-1',
        user_id: 'user-1',
        created_app_user: true,
        created_supabase_identity: true,
        created_email_identity: false,
      },
    });

    expect(secureStorage.setItemAsync).toHaveBeenCalledWith(
      APP_USER_ID_KEY,
      'app-user-1',
    );
    await expect(getTailoAppUserId()).resolves.toBe('app-user-1');
  });
});
