import { invokeTailoApi } from '@/lib/invokeTailoApi';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authSessionAccess';
import { isLinkedRemoteAccount } from '@/modules/auth/authTypes';

import {
  loadLocalPetProfile,
  saveLocalPetProfileWithRemoteId,
} from './petProfile';
import { pullRemotePetProfileIfNeeded } from './pullRemotePetProfile';

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

jest.mock('./petProfile', () => ({
  ...jest.requireActual('./petProfile'),
  loadLocalPetProfile: jest.fn(),
  saveLocalPetProfileWithRemoteId: jest.fn(),
}));

describe('pullRemotePetProfileIfNeeded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(true);
    jest.mocked(isLinkedRemoteAccount).mockReturnValue(true);
    jest.mocked(getAuthSession).mockResolvedValue({
      userId: 'user-1',
      isAnonymous: false,
      email: 'user@example.com',
      emailConfirmed: true,
    });
    jest.mocked(loadLocalPetProfile).mockResolvedValue(null);
    jest
      .mocked(saveLocalPetProfileWithRemoteId)
      .mockImplementation(async (profile) => profile);
  });

  it('pulls pet profile from get-pet when none exists locally', async () => {
    jest.mocked(invokeTailoApi).mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        pet: {
          pet_id: 'pet-remote-1',
          source_local_pet_id: 'local_pet_1',
          profile_photo_local_asset_id: 'asset-remote-1',
          name: 'Mochi',
          type: 'cat',
          gender: null,
          birthday: null,
          updated_at: '2026-05-19T00:00:00.000Z',
        },
      },
    });

    await expect(pullRemotePetProfileIfNeeded()).resolves.toEqual({
      status: 'pulled',
      profile: expect.objectContaining({
        name: 'Mochi',
        profilePhotoLocalAssetId: 'asset-remote-1',
        remotePetId: 'pet-remote-1',
      }),
    });

    expect(invokeTailoApi).toHaveBeenCalledWith('get-pet');
    expect(saveLocalPetProfileWithRemoteId).toHaveBeenCalled();
  });

  it('skips when local pet is already ready', async () => {
    jest.mocked(loadLocalPetProfile).mockResolvedValue({
      petId: 'local_pet_1',
      name: 'Mochi',
      type: 'cat',
      gender: null,
      birthday: null,
      profilePhotoLocalAssetId: null,
      profilePhotoUri: null,
      remotePetId: 'pet-remote-1',
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
    });

    await expect(pullRemotePetProfileIfNeeded()).resolves.toEqual({
      status: 'already_hydrated',
    });

    expect(invokeTailoApi).not.toHaveBeenCalled();
  });

  it('lets the cloud pet win during forced restore', async () => {
    jest.mocked(loadLocalPetProfile).mockResolvedValue({
      petId: 'local_partial_pet',
      name: 'Local Draft',
      type: 'dog',
      gender: null,
      birthday: null,
      profilePhotoLocalAssetId: 'local-photo',
      profilePhotoUri: 'file://local-photo.jpg',
      remotePetId: null,
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
    });
    jest.mocked(invokeTailoApi).mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        pet: {
          pet_id: 'pet-remote-1',
          source_local_pet_id: 'remote_local_pet_1',
          profile_photo_local_asset_id: 'asset-remote-2',
          name: 'Mochi',
          type: 'cat',
          gender: 'female',
          birthday: '2021-04-03',
          updated_at: '2026-05-19T00:00:00.000Z',
        },
      },
    });

    await expect(
      pullRemotePetProfileIfNeeded({ force: true }),
    ).resolves.toEqual({
      status: 'pulled',
      profile: expect.objectContaining({
        petId: 'remote_local_pet_1',
        name: 'Mochi',
        type: 'cat',
        profilePhotoLocalAssetId: 'asset-remote-2',
        profilePhotoUri: null,
        remotePetId: 'pet-remote-1',
      }),
    });
  });
});
