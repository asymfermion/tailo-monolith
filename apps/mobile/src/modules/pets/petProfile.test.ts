import { getDatabase } from '@/db';
import { rebuildPipelineForProfilePetType } from '@/modules/eventBuilder/rebuildPipelineForProfilePetType';

import { prepareCloudUploadPrerequisites } from '@/modules/sync/prepareCloudUploadPrerequisites';
import { getCloudImageUploadsEnabled } from '@/modules/sync/cloudImageUploadSetting';
import { runUploadQueueWorker } from '@/modules/sync/uploadQueueWorker';

import {
  LOCAL_PET_PROFILE_KEY,
  loadLocalPetProfile,
  saveLocalPetProfile,
  saveLocalPetProfilePhoto,
} from './petProfile';
import type { SecureStorage } from '@/modules/auth';

jest.mock('@/db', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('@/modules/eventBuilder/rebuildPipelineForProfilePetType', () => ({
  rebuildPipelineForProfilePetType: jest.fn(),
}));

jest.mock('./remotePetSync', () => ({
  syncRemotePetProfileIfNeeded: jest
    .fn()
    .mockResolvedValue({ status: 'skipped' }),
}));

jest.mock('@/modules/sync/prepareCloudUploadPrerequisites', () => ({
  prepareCloudUploadPrerequisites: jest
    .fn()
    .mockResolvedValue({ remotePetId: 'pet-remote-1' }),
}));

jest.mock('@/modules/sync/cloudImageUploadSetting', () => ({
  getCloudImageUploadsEnabled: jest.fn(),
}));

jest.mock('@/modules/sync/uploadQueueWorker', () => ({
  runUploadQueueWorker: jest.fn().mockResolvedValue({
    processedBatches: 0,
    uploadedAssets: 0,
    failedAssets: 0,
    skippedReason: null,
  }),
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
    jest.mocked(getCloudImageUploadsEnabled).mockReturnValue(true);
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
        birthday: '2020-05-09',
        profilePhotoLocalAssetId: 'asset-1',
        profilePhotoUri: 'ph://asset-1',
      },
      storage,
    );

    expect(profile.petId).toMatch(/^local_pet_/);
    expect(profile.name).toBe('Miso');
    expect(profile.birthday).toBe('2020-05-09');
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

  it('schedules cloud upload prerequisites when the pet profile becomes ready', async () => {
    const storage = createStorage();

    await saveLocalPetProfile(
      {
        name: 'Miso',
        type: 'cat',
      },
      storage,
    );

    await Promise.resolve();

    expect(prepareCloudUploadPrerequisites).toHaveBeenCalledTimes(1);
    expect(runUploadQueueWorker).toHaveBeenCalledTimes(1);
  });

  it('skips the upload worker when moment image uploads are disabled in dev settings', async () => {
    const storage = createStorage();
    jest.mocked(getCloudImageUploadsEnabled).mockReturnValue(false);

    await saveLocalPetProfile(
      {
        name: 'Miso',
        type: 'cat',
      },
      storage,
    );

    await Promise.resolve();

    expect(prepareCloudUploadPrerequisites).toHaveBeenCalledTimes(1);
    expect(runUploadQueueWorker).not.toHaveBeenCalled();
  });

  it('updates only the profile photo when saving a new pet picture', async () => {
    const storage = createStorage(
      JSON.stringify({
        petId: 'local_pet_1',
        name: 'Miso',
        type: 'cat',
        gender: 'female',
        birthday: '2020-05-09',
        profilePhotoLocalAssetId: 'asset-old',
        profilePhotoUri: 'file://old.jpg',
        createdAt: '2026-05-17T00:00:00.000Z',
        updatedAt: '2026-05-17T00:00:00.000Z',
      }),
    );
    const existing = await loadLocalPetProfile(storage);

    expect(existing).not.toBeNull();

    const profile = await saveLocalPetProfilePhoto(existing!, {
      profilePhotoLocalAssetId: 'asset-new',
      profilePhotoUri: 'file://new.jpg',
    }, storage);

    expect(profile.name).toBe('Miso');
    expect(profile.type).toBe('cat');
    expect(profile.gender).toBe('female');
    expect(profile.birthday).toBe('2020-05-09');
    expect(profile.profilePhotoLocalAssetId).toBe('asset-new');
    expect(profile.profilePhotoUri).toBe('file://new.jpg');
    expect(rebuildPipelineForProfilePetType).not.toHaveBeenCalled();
  });
});
