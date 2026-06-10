import {
  getAuthAccessToken,
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authSessionAccess';
import {
  getLegacyAnonymousUserId,
  LEGACY_ANON_LINKED_KEY,
} from '@/modules/auth/identity';
import { secureStorage } from '@/modules/auth/secureStorage';
import { linkLegacyAnonymousUserIfNeeded } from './legacyAnonymousLink';

jest.mock('@/lib/env', () => ({
  appEnv: {
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon-key',
  },
}));

jest.mock('@/modules/auth/authSessionAccess', () => ({
  isRemoteAuthConfigured: jest.fn(),
  getAuthSession: jest.fn(),
  getAuthAccessToken: jest.fn(),
}));

jest.mock('@/modules/auth/identity', () => ({
  getLegacyAnonymousUserId: jest.fn(),
  LEGACY_ANON_LINKED_KEY: 'tailo.legacy_anon_linked',
}));

jest.mock('@/modules/auth/secureStorage', () => ({
  secureStorage: {
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
  },
}));

describe('linkLegacyAnonymousUserIfNeeded', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  it('skips when remote auth is not configured', async () => {
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(false);

    await expect(linkLegacyAnonymousUserIfNeeded()).resolves.toEqual({
      status: 'skipped',
    });
  });

  it('links a legacy id once and records completion', async () => {
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(true);
    jest.mocked(getAuthSession).mockResolvedValue({
      userId: 'user-1',
      isAnonymous: true,
      email: null,
      emailConfirmed: false,
    });
    jest.mocked(getAuthAccessToken).mockResolvedValue('token-abc');
    jest.mocked(secureStorage.getItemAsync).mockResolvedValue(null);
    jest.mocked(getLegacyAnonymousUserId).mockResolvedValue('anon_legacy');
    jest.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user_id: 'user-1',
        app_user_id: 'app-user-1',
        created: true,
      }),
    } as Response);

    await expect(linkLegacyAnonymousUserIfNeeded()).resolves.toEqual({
      status: 'linked',
      response: {
        user_id: 'user-1',
        app_user_id: 'app-user-1',
        created: true,
      },
    });

    expect(secureStorage.setItemAsync).toHaveBeenCalledWith(
      LEGACY_ANON_LINKED_KEY,
      '1',
    );
  });

  it('does not call the API when already linked', async () => {
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(true);
    jest.mocked(getAuthSession).mockResolvedValue({
      userId: 'user-1',
      isAnonymous: true,
      email: null,
      emailConfirmed: false,
    });
    jest.mocked(secureStorage.getItemAsync).mockResolvedValue('1');

    await expect(linkLegacyAnonymousUserIfNeeded()).resolves.toEqual({
      status: 'already_linked',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
