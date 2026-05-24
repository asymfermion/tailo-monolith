import { hasReadyLocalPetProfile } from '@/modules/pets/petProfile';

import {
  ensureAnonymousCloudAccountIfNeeded,
  shouldBootstrapRemoteAuthAtStartup,
} from './anonymousCloudAccount';
import { isAuthRequireLogin } from './authRequireLogin';
import { notifyAuthSessionChanged } from './authSessionEvents';
import { getAuthProvider } from './authProviderInstance';
import { ensureCurrentUserIfNeeded } from './ensureCurrentUser';

jest.mock('./authProviderInstance', () => ({
  getAuthProvider: jest.fn(),
}));

jest.mock('./authRequireLogin', () => ({
  isAuthRequireLogin: jest.fn(),
}));

jest.mock('./authSessionEvents', () => ({
  notifyAuthSessionChanged: jest.fn(),
}));

jest.mock('./ensureCurrentUser', () => ({
  ensureCurrentUserIfNeeded: jest.fn(),
  getTailoAppUserId: jest.fn(),
}));

jest.mock('./legacyAnonymousLink', () => ({
  linkLegacyAnonymousUserIfNeeded: jest.fn(),
}));

jest.mock('@/modules/pets/petProfile', () => ({
  hasReadyLocalPetProfile: jest.fn(),
}));

describe('shouldBootstrapRemoteAuthAtStartup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when remote auth is not configured', async () => {
    jest.mocked(getAuthProvider).mockReturnValue({
      isConfigured: () => false,
    } as never);

    await expect(shouldBootstrapRemoteAuthAtStartup()).resolves.toBe(false);
  });

  it('returns true when a session already exists', async () => {
    jest.mocked(getAuthProvider).mockReturnValue({
      isConfigured: () => true,
      getSession: jest.fn().mockResolvedValue({ userId: 'user-1' }),
    } as never);

    await expect(shouldBootstrapRemoteAuthAtStartup()).resolves.toBe(true);
    expect(hasReadyLocalPetProfile).not.toHaveBeenCalled();
  });

  it('returns true when a ready pet profile exists without a session', async () => {
    jest.mocked(getAuthProvider).mockReturnValue({
      isConfigured: () => true,
      getSession: jest.fn().mockResolvedValue(null),
    } as never);
    jest.mocked(hasReadyLocalPetProfile).mockResolvedValue(true);

    await expect(shouldBootstrapRemoteAuthAtStartup()).resolves.toBe(true);
  });

  it('returns false for a fresh install without pet profile', async () => {
    jest.mocked(getAuthProvider).mockReturnValue({
      isConfigured: () => true,
      getSession: jest.fn().mockResolvedValue(null),
    } as never);
    jest.mocked(hasReadyLocalPetProfile).mockResolvedValue(false);

    await expect(shouldBootstrapRemoteAuthAtStartup()).resolves.toBe(false);
  });
});

describe('ensureAnonymousCloudAccountIfNeeded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isAuthRequireLogin).mockResolvedValue(false);
    jest.mocked(hasReadyLocalPetProfile).mockResolvedValue(true);
    jest.mocked(getAuthProvider).mockReturnValue({
      isConfigured: () => true,
      getSession: jest.fn().mockResolvedValueOnce(null).mockResolvedValue({
        userId: 'anon-1',
        isAnonymous: true,
        email: null,
        emailConfirmed: false,
      }),
      bootstrapSession: jest.fn().mockResolvedValue({
        status: 'ready',
        session: {
          userId: 'anon-1',
          isAnonymous: true,
          email: null,
          emailConfirmed: false,
        },
        createdSession: true,
      }),
    } as never);
    jest
      .mocked(ensureCurrentUserIfNeeded)
      .mockResolvedValue({ status: 'ensured', response: {} as never });
  });

  it('defers when pet profile is not ready', async () => {
    jest.mocked(hasReadyLocalPetProfile).mockResolvedValue(false);

    await expect(ensureAnonymousCloudAccountIfNeeded()).resolves.toEqual({
      status: 'no_pet',
    });
  });

  it('creates anonymous session and ensures app user after pet profile', async () => {
    await expect(ensureAnonymousCloudAccountIfNeeded()).resolves.toMatchObject({
      status: 'ready',
      createdSession: true,
    });

    expect(getAuthProvider().bootstrapSession).toHaveBeenCalledTimes(1);
    expect(ensureCurrentUserIfNeeded).toHaveBeenCalledTimes(1);
    expect(notifyAuthSessionChanged).toHaveBeenCalledTimes(1);
  });
});
