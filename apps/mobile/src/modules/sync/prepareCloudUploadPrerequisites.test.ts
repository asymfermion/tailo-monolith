import { ensureAnonymousCloudAccountIfNeeded } from '@/modules/auth/anonymousCloudAccount';
import { isRemoteAuthConfigured } from '@/modules/auth/authService';
import {
  isLocalPetProfileReady,
  loadLocalPetProfile,
  type LocalPetProfile,
} from '@/modules/pets/petProfile';
import { syncRemotePetProfileIfNeeded } from '@/modules/pets/remotePetSync';

import { prepareCloudUploadPrerequisites } from './prepareCloudUploadPrerequisites';

jest.mock('@/modules/auth/anonymousCloudAccount', () => ({
  ensureAnonymousCloudAccountIfNeeded: jest.fn(),
}));

jest.mock('@/modules/auth/authService', () => ({
  isRemoteAuthConfigured: jest.fn(),
}));

jest.mock('@/modules/pets/petProfile', () => ({
  isLocalPetProfileReady: jest.fn(),
  loadLocalPetProfile: jest.fn(),
}));

jest.mock('@/modules/pets/remotePetSync', () => ({
  syncRemotePetProfileIfNeeded: jest.fn(),
}));

const readyProfile: LocalPetProfile = {
  petId: 'local_pet_1',
  name: 'Miso',
  type: 'cat',
  gender: null,
  birthday: null,
  profilePhotoLocalAssetId: null,
  profilePhotoUri: null,
  remotePetId: null,
  createdAt: '2026-05-18T00:00:00.000Z',
  updatedAt: '2026-05-18T00:00:00.000Z',
};

describe('prepareCloudUploadPrerequisites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(true);
    jest.mocked(loadLocalPetProfile).mockResolvedValue(readyProfile);
    jest.mocked(isLocalPetProfileReady).mockReturnValue(true);
    jest.mocked(ensureAnonymousCloudAccountIfNeeded).mockResolvedValue({
      status: 'ready',
      session: {
        userId: 'user-1',
        isAnonymous: true,
        email: null,
        emailConfirmed: false,
      },
      createdSession: true,
    });
    jest.mocked(syncRemotePetProfileIfNeeded).mockResolvedValue({
      status: 'synced',
      response: {
        pet_id: 'pet-remote-1',
        created: true,
      },
    });
  });

  it('returns null when remote auth is not configured', async () => {
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(false);

    await expect(prepareCloudUploadPrerequisites()).resolves.toEqual({
      remotePetId: null,
    });

    expect(ensureAnonymousCloudAccountIfNeeded).not.toHaveBeenCalled();
  });

  it('returns null without creating an account when the pet profile is incomplete', async () => {
    jest.mocked(isLocalPetProfileReady).mockReturnValue(false);

    await expect(prepareCloudUploadPrerequisites()).resolves.toEqual({
      remotePetId: null,
    });

    expect(ensureAnonymousCloudAccountIfNeeded).not.toHaveBeenCalled();
    expect(syncRemotePetProfileIfNeeded).not.toHaveBeenCalled();
  });

  it('ensures anonymous account and syncs the pet before upload', async () => {
    await expect(prepareCloudUploadPrerequisites()).resolves.toEqual({
      remotePetId: 'pet-remote-1',
    });

    expect(ensureAnonymousCloudAccountIfNeeded).toHaveBeenCalledTimes(1);
    expect(syncRemotePetProfileIfNeeded).toHaveBeenCalledTimes(1);
  });
});
