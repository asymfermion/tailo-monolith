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
import { saveLocalPetProfileWithRemoteId } from '@/modules/pets/petProfile';

import {
  countLocalProcessedTimelineEvents,
  getCloudHydratedEventCount,
  hydrateCloudTimelineIfNeeded,
} from './hydrateCloudTimeline';
import { repairHydratedTimelineData } from './repairHydratedTimelineData';
import { restoreRemoteAccountDataIfNeeded } from './restoreRemoteAccountData';

jest.mock('@/db', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    getFirstAsync: jest.fn().mockResolvedValue(null),
  }),
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

jest.mock('@/modules/pets/petProfile', () => ({
  saveLocalPetProfileWithRemoteId: jest.fn(),
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
      profilePhotoLocalAssetId: null,
      profilePhotoUri: null,
      remotePetId: 'pet-remote-1',
    } as Awaited<ReturnType<typeof loadLocalPetProfile>>);
    jest
      .mocked(saveLocalPetProfileWithRemoteId)
      .mockImplementation(async (profile) => profile);
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

  it('hydrates local pet profile photo uri from hydrated assets', async () => {
    jest.mocked(countLocalProcessedTimelineEvents).mockResolvedValue(0);
    jest.mocked(hydrateCloudTimelineIfNeeded).mockResolvedValue({
      status: 'hydrated',
      eventCount: 2,
    });
    jest.mocked(loadLocalPetProfile).mockResolvedValue({
      petId: 'pet-1',
      name: 'Link',
      type: 'dog',
      profilePhotoLocalAssetId: 'asset-remote-1',
      profilePhotoUri: null,
      remotePetId: 'pet-remote-1',
    } as Awaited<ReturnType<typeof loadLocalPetProfile>>);
    const database = {
      getFirstAsync: jest
        .fn()
        .mockResolvedValue({ uri: 'https://example.com/thumb.jpg' }),
    };
    const { getDatabase } = jest.requireMock('@/db') as {
      getDatabase: jest.Mock;
    };
    getDatabase.mockResolvedValue(database);

    await restoreRemoteAccountDataIfNeeded({ force: true });

    expect(database.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('FROM local_assets'),
      ['asset-remote-1'],
    );
    expect(saveLocalPetProfileWithRemoteId).toHaveBeenCalledWith(
      expect.objectContaining({
        profilePhotoLocalAssetId: 'asset-remote-1',
        profilePhotoUri: 'https://example.com/thumb.jpg',
      }),
      'pet-remote-1',
    );
  });
});
