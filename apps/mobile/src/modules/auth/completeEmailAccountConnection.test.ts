import { completeEmailAccountConnection } from './completeEmailAccountConnection';
import { ensureCurrentUserIfNeeded } from './ensureCurrentUser';
import { getAuthProvider } from './authProviderInstance';
import { linkLegacyAnonymousUserIfNeeded } from './legacyAnonymousLink';
import {
  pullRemoteAccountProfileIfNeeded,
  seedLocalAccountPrefsToCloudIfEmpty,
} from './remoteAccountProfile';
import { syncRemotePetProfileIfNeeded } from '@/modules/pets/remotePetSync';
import { restoreRemoteAccountDataIfNeeded } from '@/modules/sync/restoreRemoteAccountData';

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
  pullRemoteAccountProfileIfNeeded: jest.fn(),
  seedLocalAccountPrefsToCloudIfEmpty: jest.fn(),
}));

jest.mock('@/modules/pets/remotePetSync', () => ({
  syncRemotePetProfileIfNeeded: jest.fn(),
}));

jest.mock('@/modules/sync/restoreRemoteAccountData', () => ({
  restoreRemoteAccountDataIfNeeded: jest.fn(),
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
    } as unknown as ReturnType<typeof getAuthProvider>);
    jest
      .mocked(ensureCurrentUserIfNeeded)
      .mockResolvedValue({ status: 'ensured', response: {} as never });
    jest
      .mocked(linkLegacyAnonymousUserIfNeeded)
      .mockResolvedValue({ status: 'skipped' });
    jest
      .mocked(seedLocalAccountPrefsToCloudIfEmpty)
      .mockResolvedValue({ status: 'skipped' });
    jest
      .mocked(syncRemotePetProfileIfNeeded)
      .mockResolvedValue({ status: 'skipped' });
    jest.mocked(restoreRemoteAccountDataIfNeeded).mockResolvedValue({
      status: 'restored',
      accountPulled: true,
      petPulled: true,
      eventCount: 2,
    });
    jest
      .mocked(pullRemoteAccountProfileIfNeeded)
      .mockResolvedValue({ status: 'skipped' });
  });

  it('skips when remote auth is not configured', async () => {
    jest.mocked(getAuthProvider).mockReturnValue({
      isConfigured: () => false,
    } as unknown as ReturnType<typeof getAuthProvider>);

    await expect(completeEmailAccountConnection()).resolves.toEqual({
      status: 'skipped',
    });
  });

  it('restores cloud data and seeds empty profile fields for a linked account', async () => {
    await expect(completeEmailAccountConnection()).resolves.toEqual({
      status: 'completed',
    });

    expect(restoreRemoteAccountDataIfNeeded).toHaveBeenCalledWith({
      force: true,
    });
    expect(seedLocalAccountPrefsToCloudIfEmpty).toHaveBeenCalled();
    expect(syncRemotePetProfileIfNeeded).toHaveBeenCalled();
    expect(pullRemoteAccountProfileIfNeeded).not.toHaveBeenCalled();
  });

  it('refreshes account profile when restore is skipped', async () => {
    jest.mocked(restoreRemoteAccountDataIfNeeded).mockResolvedValue({
      status: 'skipped',
    });
    jest
      .mocked(pullRemoteAccountProfileIfNeeded)
      .mockResolvedValue({ status: 'pulled', profile: {} as never });

    await expect(completeEmailAccountConnection()).resolves.toEqual({
      status: 'completed',
    });

    expect(pullRemoteAccountProfileIfNeeded).toHaveBeenCalled();
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
