import { completeEmailAccountConnection } from './completeEmailAccountConnection';
import { ensureCurrentUserIfNeeded } from './ensureCurrentUser';
import { getAuthProvider } from './authProviderInstance';
import { linkLegacyAnonymousUserIfNeeded } from './legacyAnonymousLink';
import { syncRemoteAccountProfile } from './remoteAccountProfile';
import { syncRemotePetProfileIfNeeded } from '@/modules/pets';

jest.mock('./authProviderInstance', () => ({
  getAuthProvider: jest.fn(),
}));

jest.mock('./ensureCurrentUser', () => ({
  ensureCurrentUserIfNeeded: jest.fn(),
}));

jest.mock('./legacyAnonymousLink', () => ({
  linkLegacyAnonymousUserIfNeeded: jest.fn(),
}));

jest.mock('./remoteAccountProfile', () => ({
  syncRemoteAccountProfile: jest.fn(),
}));

jest.mock('@/modules/pets', () => ({
  syncRemotePetProfileIfNeeded: jest.fn(),
}));

jest.mock('@/i18n/locale', () => ({
  getAppLocale: jest.fn(() => 'en'),
}));

jest.mock('@/lib/appTheme', () => ({
  getAppTheme: jest.fn(() => 'light'),
}));

jest.mock('@/lib/appFontStyle', () => ({
  getAppFontStyle: jest.fn(() => 'system'),
}));

describe('completeEmailAccountConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getAuthProvider).mockReturnValue({
      kind: 'mock',
      isConfigured: () => true,
      getSession: jest.fn().mockResolvedValue({
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: true,
      }),
    } as ReturnType<typeof getAuthProvider>);
    jest
      .mocked(ensureCurrentUserIfNeeded)
      .mockResolvedValue({ status: 'ensured', response: {} as never });
    jest
      .mocked(linkLegacyAnonymousUserIfNeeded)
      .mockResolvedValue({ status: 'skipped' });
    jest
      .mocked(syncRemoteAccountProfile)
      .mockResolvedValue({ status: 'synced', response: {} as never });
    jest
      .mocked(syncRemotePetProfileIfNeeded)
      .mockResolvedValue({ status: 'skipped' });
  });

  it('skips when remote auth is not configured', async () => {
    jest.mocked(getAuthProvider).mockReturnValue({
      isConfigured: () => false,
    } as ReturnType<typeof getAuthProvider>);

    await expect(completeEmailAccountConnection()).resolves.toEqual({
      status: 'skipped',
    });
  });

  it('syncs profile and pet for a linked account', async () => {
    await expect(completeEmailAccountConnection()).resolves.toEqual({
      status: 'completed',
    });

    expect(syncRemoteAccountProfile).toHaveBeenCalledWith({
      preferredLocale: 'en',
      preferredTheme: 'light',
      preferredFontStyle: 'system',
    });
    expect(syncRemotePetProfileIfNeeded).toHaveBeenCalled();
  });

  it('returns partial when ensure-current-user fails', async () => {
    jest.mocked(ensureCurrentUserIfNeeded).mockResolvedValue({
      status: 'error',
      message: 'Network error',
    });

    await expect(completeEmailAccountConnection()).resolves.toEqual({
      status: 'partial',
      message: 'Network error',
    });
  });
});
