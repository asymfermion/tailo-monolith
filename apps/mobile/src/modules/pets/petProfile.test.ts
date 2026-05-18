import { getDatabase } from '@/db';
import { rebuildPipelineForProfilePetType } from '@/modules/eventBuilder/rebuildPipelineForProfilePetType';

import {
  LOCAL_PET_PROFILE_KEY,
  loadLocalPetProfile,
  saveLocalPetProfile,
} from './petProfile';
import type { SecureStorage } from '@/modules/auth';

jest.mock('@/db', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('@/modules/eventBuilder/rebuildPipelineForProfilePetType', () => ({
  rebuildPipelineForProfilePetType: jest.fn(),
}));

function createStorage(initialValue: string | null = null): SecureStorage & {
  setItemAsync: jest.Mock;
} {
  let value = initialValue;

  return {
    getItemAsync: jest.fn(async () => value),
    setItemAsync: jest.fn(async (_key: string, nextValue: string) => {
      value = nextValue;
    }),
    deleteItemAsync: jest.fn(async () => {
      value = null;
    }),
  };
}

describe('local pet profile storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getDatabase).mockResolvedValue({} as never);
    jest.mocked(rebuildPipelineForProfilePetType).mockResolvedValue({
      updatedAssetCount: 0,
    });
  });

  it('returns null when no pet has been saved', async () => {
    await expect(loadLocalPetProfile(createStorage())).resolves.toBeNull();
  });

  it('saves one local pet profile', async () => {
    const storage = createStorage();

    const profile = await saveLocalPetProfile(
      {
        name: 'Miso',
        type: 'cat',
        gender: 'female',
        profilePhotoLocalAssetId: 'asset-1',
        profilePhotoUri: 'ph://asset-1',
      },
      storage,
    );

    expect(profile.petId).toMatch(/^local_pet_/);
    expect(profile.name).toBe('Miso');
    expect(storage.setItemAsync).toHaveBeenCalledWith(
      LOCAL_PET_PROFILE_KEY,
      expect.stringContaining('"name":"Miso"'),
    );
    expect(rebuildPipelineForProfilePetType).toHaveBeenCalledWith(
      expect.anything(),
      'cat',
    );
  });

  it('does not rebuild the pipeline when the pet type is unchanged', async () => {
    const storage = createStorage(
      JSON.stringify({
        petId: 'local_pet_1',
        name: 'Miso',
        type: 'cat',
        gender: null,
        profilePhotoLocalAssetId: null,
        profilePhotoUri: null,
        createdAt: '2026-05-17T00:00:00.000Z',
        updatedAt: '2026-05-17T00:00:00.000Z',
      }),
    );

    await saveLocalPetProfile(
      {
        name: 'Miso',
        type: 'cat',
      },
      storage,
    );

    expect(rebuildPipelineForProfilePetType).not.toHaveBeenCalled();
  });
});
