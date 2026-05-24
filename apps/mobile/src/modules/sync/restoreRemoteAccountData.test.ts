import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';
import { isLinkedRemoteAccount } from '@/modules/auth/authTypes';
import { pullRemoteAccountProfileIfNeeded } from '@/modules/auth/remoteAccountProfile';
import {
  hasReadyLocalPetProfile,
  loadLocalPetProfile,
  pullRemotePetProfileIfNeeded,
} from '@/modules/pets';

import {
  countLocalProcessedTimelineEvents,
  getCloudHydratedEventCount,
  hydrateCloudTimelineIfNeeded,
} from './hydrateCloudTimeline';
import { repairHydratedTimelineData } from './repairHydratedTimelineData';
import { restoreRemoteAccountDataIfNeeded } from './restoreRemoteAccountData';

jest.mock('@/db', () => ({
  getDatabase: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/db/syncState', () => ({
  setSyncStateValue: jest.fn().mockResolvedValue(undefined),
  SYNC_STATE_KEYS: {
    PROFILE_PET_FILTER_APPLIED: 'pipeline.profile_pet_filter_applied',
  },
}));

jest.mock('@/modules/auth/authService', () => ({
  getAuthSession: jest.fn(),
  isRemoteAuthConfigured: jest.fn(),
}));

jest.mock('@/modules/auth/authTypes', () => ({
  isLinkedRemoteAccount: jest.fn(),
}));

jest.mock('@/modules/auth/remoteAccountProfile', () => ({
  pullRemoteAccountProfileIfNeeded: jest.fn(),
}));

jest.mock('@/modules/pets', () => ({
  hasReadyLocalPetProfile: jest.fn(),
  loadLocalPetProfile: jest.fn(),
  pullRemotePetProfileIfNeeded: jest.fn(),
}));

jest.mock('./hydrateCloudTimeline', () => ({
  getCloudHydratedEventCount: jest.fn(),
  countLocalProcessedTimelineEvents: jest.fn(),
  hydrateCloudTimelineIfNeeded: jest.fn(),
}));

jest.mock('./repairHydratedTimelineData', () => ({
  repairHydratedTimelineData: jest.fn(),
}));

describe('restoreRemoteAccountDataIfNeeded', () => {
  beforeEach(() => {
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(true);
    jest.mocked(getAuthSession).mockResolvedValue({
      userId: 'user-1',
      isAnonymous: false,
      email: 'user@example.com',
      emailConfirmed: true,
    } as Awaited<ReturnType<typeof getAuthSession>>);
    jest.mocked(isLinkedRemoteAccount).mockReturnValue(true);
    jest.mocked(getCloudHydratedEventCount).mockResolvedValue(0);
    jest
      .mocked(pullRemoteAccountProfileIfNeeded)
      .mockResolvedValue({ status: 'skipped' });
    jest.mocked(hasReadyLocalPetProfile).mockResolvedValue(true);
    jest
      .mocked(pullRemotePetProfileIfNeeded)
      .mockResolvedValue({ status: 'skipped' });
    jest.mocked(loadLocalPetProfile).mockResolvedValue({
      petId: 'pet-1',
      name: 'Link',
      type: 'dog',
    } as Awaited<ReturnType<typeof loadLocalPetProfile>>);
    jest
      .mocked(repairHydratedTimelineData)
      .mockResolvedValue({ repairedAssetUris: 0, repairedEventTimestamps: 0 });
  });

  it('skips cloud timeline hydrate when force restore runs on a device with local moments', async () => {
    jest.mocked(countLocalProcessedTimelineEvents).mockResolvedValue(5);

    await expect(
      restoreRemoteAccountDataIfNeeded({ force: true }),
    ).resolves.toEqual({
      status: 'restored',
      accountPulled: false,
      petPulled: false,
      eventCount: 5,
    });

    expect(hydrateCloudTimelineIfNeeded).not.toHaveBeenCalled();
    expect(repairHydratedTimelineData).toHaveBeenCalled();
  });

  it('hydrates timeline on force restore when device has no local moments', async () => {
    jest.mocked(countLocalProcessedTimelineEvents).mockResolvedValue(0);
    jest.mocked(hydrateCloudTimelineIfNeeded).mockResolvedValue({
      status: 'hydrated',
      eventCount: 3,
    });

    await expect(
      restoreRemoteAccountDataIfNeeded({ force: true }),
    ).resolves.toEqual({
      status: 'restored',
      accountPulled: false,
      petPulled: false,
      eventCount: 3,
    });

    expect(hydrateCloudTimelineIfNeeded).toHaveBeenCalled();
    expect(repairHydratedTimelineData).toHaveBeenCalled();
  });
});
