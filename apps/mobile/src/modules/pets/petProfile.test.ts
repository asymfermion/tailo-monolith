import {
  LOCAL_PET_PROFILE_KEY,
  loadLocalPetProfile,
  saveLocalPetProfile,
} from './petProfile';
import type { SecureStorage } from '@/modules/auth';

function createStorage(initialValue: string | null = null): SecureStorage & {
  setItemAsync: jest.Mock;
} {
  let value = initialValue;

  return {
    getItemAsync: jest.fn(async () => value),
    setItemAsync: jest.fn(async (_key: string, nextValue: string) => {
      value = nextValue;
    }),
  };
}

describe('local pet profile storage', () => {
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
  });
});
