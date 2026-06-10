import { invokeTailoApi } from '@/lib/invokeTailoApi';
import { setAppFontStyle } from '@/lib/appFontStyle';
import { setAppLocale } from '@/i18n/locale';
import { setAppTheme } from '@/lib/appTheme';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authSessionAccess';
import { isLinkedRemoteAccount } from '@/modules/auth/authTypes';
import { getAuthProvider } from '@/modules/auth/authProviderInstance';
import {
  loadLocalAccountProfile,
  saveLocalAccountProfile,
} from '@/modules/auth/localAccountProfile';

import {
  applyIdentityDisplayNameIfMissing,
  applyRemoteAccountProfile,
  pullRemoteAccountProfileIfNeeded,
  seedLocalAccountPrefsToCloudIfEmpty,
} from './remoteAccountProfile';

jest.mock('@/lib/invokeTailoApi', () => ({
  invokeTailoApi: jest.fn(),
}));

jest.mock('@/modules/auth/authSessionAccess', () => ({
  isRemoteAuthConfigured: jest.fn(),
  getAuthSession: jest.fn(),
}));

jest.mock('@/modules/auth/authTypes', () => ({
  isLinkedRemoteAccount: jest.fn(),
}));

jest.mock('@/modules/auth/authProviderInstance', () => ({
  getAuthProvider: jest.fn(),
}));

jest.mock('@/modules/auth/localAccountProfile', () => ({
  loadLocalAccountProfile: jest.fn(),
  saveLocalAccountProfile: jest.fn(),
}));

jest.mock('@/i18n/locale', () => ({
  getAppLocale: jest.fn(() => 'en'),
  setAppLocale: jest.fn(),
}));

jest.mock('@/lib/appTheme', () => ({
  getAppTheme: jest.fn(() => 'dark'),
  setAppTheme: jest.fn(),
  isAppTheme: (value: string) => value === 'light' || value === 'dark',
}));

jest.mock('@/lib/appFontStyle', () => ({
  getAppFontStyle: jest.fn(() => 'rounded'),
  setAppFontStyle: jest.fn(),
  isAppFontStyle: (value: string) =>
    ['system', 'serif', 'rounded', 'modern', 'elegant'].includes(value),
}));

describe('pullRemoteAccountProfileIfNeeded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(true);
    jest.mocked(isLinkedRemoteAccount).mockReturnValue(true);
    jest.mocked(getAuthSession).mockResolvedValue({
      userId: 'user-1',
      appUserId: 'app-1',
      isAnonymous: false,
      email: 'user@example.com',
      emailConfirmed: true,
    });
  });

  it('applies cloud profile fields locally', async () => {
    jest.mocked(invokeTailoApi).mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        profile: {
          app_user_id: 'app-1',
          display_name: 'Alex',
          preferred_locale: 'zh-Hans',
          preferred_theme: 'dark',
          preferred_font_style: 'rounded',
          updated_at: '2026-05-19T00:00:00.000Z',
        },
      },
    });

    await expect(pullRemoteAccountProfileIfNeeded()).resolves.toMatchObject({
      status: 'pulled',
      profile: {
        displayName: 'Alex',
        preferredLocale: 'zh-Hans',
        preferredTheme: 'dark',
        preferredFontStyle: 'rounded',
      },
    });

    expect(saveLocalAccountProfile).toHaveBeenCalledWith({
      displayName: 'Alex',
    });
    expect(setAppLocale).toHaveBeenCalledWith('zh-Hans');
    expect(setAppTheme).toHaveBeenCalledWith('dark');
    expect(setAppFontStyle).toHaveBeenCalledWith('rounded');
  });
});

describe('applyRemoteAccountProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps a local display name when cloud profile is blank', async () => {
    jest.mocked(loadLocalAccountProfile).mockResolvedValue({
      displayName: 'Apple User',
      updatedAt: '2026-06-10T00:00:00.000Z',
    });

    await applyRemoteAccountProfile({
      display_name: null,
      preferred_locale: null,
      preferred_theme: null,
      preferred_font_style: null,
    });

    expect(saveLocalAccountProfile).toHaveBeenCalledWith({
      displayName: 'Apple User',
    });
  });
});

describe('applyIdentityDisplayNameIfMissing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips when local display name already exists', async () => {
    jest.mocked(loadLocalAccountProfile).mockResolvedValue({
      displayName: 'Mochi',
      updatedAt: '2026-06-10T00:00:00.000Z',
    });

    await expect(applyIdentityDisplayNameIfMissing()).resolves.toBe(false);
    expect(saveLocalAccountProfile).not.toHaveBeenCalled();
  });

  it('backfills local display name from auth identity metadata', async () => {
    jest.mocked(loadLocalAccountProfile).mockResolvedValue(null);
    jest.mocked(getAuthProvider).mockReturnValue({
      getIdentityDisplayName: jest.fn().mockResolvedValue('Apple User'),
    } as never);

    await expect(applyIdentityDisplayNameIfMissing()).resolves.toBe(true);

    expect(saveLocalAccountProfile).toHaveBeenCalledWith({
      displayName: 'Apple User',
    });
  });
});

describe('seedLocalAccountPrefsToCloudIfEmpty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(true);
    jest.mocked(isLinkedRemoteAccount).mockReturnValue(true);
    jest.mocked(getAuthSession).mockResolvedValue({
      userId: 'user-1',
      appUserId: 'app-1',
      isAnonymous: false,
      email: 'user@example.com',
      emailConfirmed: true,
    });
    jest.mocked(getAuthProvider).mockReturnValue({
      getIdentityDisplayName: jest.fn().mockResolvedValue(null),
    } as never);
  });

  it('seeds only missing cloud preference fields', async () => {
    jest.mocked(loadLocalAccountProfile).mockResolvedValue(null);
    jest
      .mocked(invokeTailoApi)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        payload: {
          profile: {
            app_user_id: 'app-1',
            display_name: 'Alex',
            preferred_locale: null,
            preferred_theme: 'dark',
            preferred_font_style: null,
            updated_at: '2026-05-19T00:00:00.000Z',
          },
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        payload: {
          app_user_id: 'app-1',
          display_name: 'Alex',
          preferred_locale: 'en',
          preferred_theme: 'dark',
          preferred_font_style: 'rounded',
          created: false,
          updated_at: '2026-05-19T00:00:00.000Z',
        },
      });

    await expect(seedLocalAccountPrefsToCloudIfEmpty()).resolves.toMatchObject({
      status: 'synced',
    });

    expect(invokeTailoApi).toHaveBeenLastCalledWith('upsert-account-profile', {
      preferred_locale: 'en',
      preferred_font_style: 'rounded',
    });
  });

  it('uses identity display name when cloud display name is blank', async () => {
    jest.mocked(loadLocalAccountProfile).mockResolvedValue(null);
    jest.mocked(getAuthProvider).mockReturnValue({
      getIdentityDisplayName: jest.fn().mockResolvedValue('Google Name'),
    } as never);
    jest
      .mocked(invokeTailoApi)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        payload: {
          profile: {
            app_user_id: 'app-1',
            display_name: '',
            preferred_locale: null,
            preferred_theme: null,
            preferred_font_style: null,
            updated_at: '2026-05-19T00:00:00.000Z',
          },
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        payload: {
          app_user_id: 'app-1',
          display_name: 'Google Name',
          preferred_locale: 'en',
          preferred_theme: 'dark',
          preferred_font_style: 'rounded',
          created: false,
          updated_at: '2026-05-19T00:00:00.000Z',
        },
      });

    await expect(seedLocalAccountPrefsToCloudIfEmpty()).resolves.toMatchObject({
      status: 'synced',
    });

    expect(invokeTailoApi).toHaveBeenLastCalledWith('upsert-account-profile', {
      display_name: 'Google Name',
      preferred_locale: 'en',
      preferred_theme: 'dark',
      preferred_font_style: 'rounded',
    });
  });
});
