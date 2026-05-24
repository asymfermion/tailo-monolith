import { ensureAnonymousCloudAccountIfNeeded } from '@/modules/auth/anonymousCloudAccount';
import { syncRemotePetProfileIfNeeded } from '@/modules/pets/remotePetSync';
import { runCloudSyncPass } from '@/modules/sync/runCloudSyncPass';

import {
  ensureOnboardingCloudIdentity,
  schedulePostOnboardingCloudSync,
} from './onboardingCloudSetup';

jest.mock('@/db', () => ({
  getDatabase: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/modules/auth/anonymousCloudAccount', () => ({
  ensureAnonymousCloudAccountIfNeeded: jest.fn(),
}));

jest.mock('@/modules/pets/remotePetSync', () => ({
  syncRemotePetProfileIfNeeded: jest.fn(),
}));

jest.mock('@/modules/sync/runCloudSyncPass', () => ({
  runCloudSyncPass: jest.fn().mockResolvedValue(undefined),
}));

describe('onboardingCloudSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(ensureAnonymousCloudAccountIfNeeded).mockResolvedValue({
      status: 'ready',
      createdSession: false,
      session: {
        userId: 'user-1',
        isAnonymous: true,
        email: null,
        emailConfirmed: false,
      },
    });
    jest
      .mocked(syncRemotePetProfileIfNeeded)
      .mockResolvedValue({ status: 'skipped' });
  });

  it('ensures account and pet sync before onboarding completes', async () => {
    await ensureOnboardingCloudIdentity();

    expect(ensureAnonymousCloudAccountIfNeeded).toHaveBeenCalled();
    expect(syncRemotePetProfileIfNeeded).toHaveBeenCalled();
    expect(runCloudSyncPass).not.toHaveBeenCalled();
  });

  it('schedules upload sync in the background', async () => {
    schedulePostOnboardingCloudSync();

    await Promise.resolve();

    expect(runCloudSyncPass).toHaveBeenCalled();
  });
});
