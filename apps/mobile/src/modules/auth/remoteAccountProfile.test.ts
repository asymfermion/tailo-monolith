import {
  getAuthAccessToken,
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';
import { isLinkedRemoteAccount } from '@/modules/auth/authTypes';
import { syncRemoteAccountProfile } from './remoteAccountProfile';

jest.mock('@/lib/env', () => ({
  appEnv: {
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon-key',
  },
}));

jest.mock('@/i18n/locale', () => ({
  getAppLocale: jest.fn(() => 'en'),
  setAppLocale: jest.fn(),
}));

jest.mock('@/lib/appTheme', () => ({
  getAppTheme: jest.fn(() => 'light'),
  setAppTheme: jest.fn(),
  isAppTheme: (value: string) => value === 'light' || value === 'dark',
}));

jest.mock('@/lib/appFontStyle', () => ({
  getAppFontStyle: jest.fn(() => 'system'),
  setAppFontStyle: jest.fn(),
  isAppFontStyle: (value: string) =>
    ['system', 'serif', 'rounded', 'modern', 'elegant'].includes(value),
}));

jest.mock('@/modules/auth/localAccountProfile', () => ({
  saveLocalAccountProfile: jest.fn(),
}));

jest.mock('@/modules/auth/authService', () => ({
  isRemoteAuthConfigured: jest.fn(),
  getAuthSession: jest.fn(),
  getAuthAccessToken: jest.fn(),
}));

jest.mock('@/modules/auth/authTypes', () => ({
  isLinkedRemoteAccount: jest.fn(),
}));

describe('syncRemoteAccountProfile', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  it('skips when not linked', async () => {
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(true);
    jest.mocked(getAuthSession).mockResolvedValue({
      userId: 'user-1',
      isAnonymous: true,
      email: null,
      emailConfirmed: false,
    });
    jest.mocked(isLinkedRemoteAccount).mockReturnValue(false);

    await expect(
      syncRemoteAccountProfile({ displayName: 'Mochi' }),
    ).resolves.toEqual({ status: 'not_linked' });
  });

  it('syncs display name for a linked account', async () => {
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(true);
    jest.mocked(getAuthSession).mockResolvedValue({
      userId: 'user-1',
      appUserId: 'app-1',
      isAnonymous: false,
      email: 'user@example.com',
      emailConfirmed: true,
    });
    jest.mocked(isLinkedRemoteAccount).mockReturnValue(true);
    jest.mocked(getAuthAccessToken).mockResolvedValue('token-abc');
    jest.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        app_user_id: 'app-1',
        display_name: 'Mochi',
        preferred_locale: 'en',
        preferred_theme: 'light',
        preferred_font_style: 'system',
        created: false,
        updated_at: '2026-05-19T00:00:00.000Z',
      }),
    } as Response);

    await expect(
      syncRemoteAccountProfile({ displayName: 'Mochi' }),
    ).resolves.toMatchObject({
      status: 'synced',
      response: { display_name: 'Mochi' },
    });
  });
});
