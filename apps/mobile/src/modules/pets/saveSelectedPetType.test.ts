import { getDatabase } from '@/db';
import { rebuildPipelineForProfilePetType } from '@/modules/eventBuilder/rebuildPipelineForProfilePetType';

import {
  loadLocalPetProfile,
  LOCAL_PET_PROFILE_KEY,
  saveSelectedPetType,
} from './petProfile';
import type { SecureStorage } from '@/modules/auth';

jest.mock('@/db', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('@/modules/eventBuilder/rebuildPipelineForProfilePetType', () => ({
  rebuildPipelineForProfilePetType: jest.fn(),
}));

function createStorage(): SecureStorage & { setItemAsync: jest.Mock } {
  let value: string | null = null;

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

describe('saveSelectedPetType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getDatabase).mockResolvedValue({} as never);
    jest.mocked(rebuildPipelineForProfilePetType).mockResolvedValue({
      updatedAssetCount: 3,
    });
  });

  it('stores the selected type and rebuilds the pipeline', async () => {
    const storage = createStorage();

    const profile = await saveSelectedPetType('dog', storage);

    expect(profile.type).toBe('dog');
    expect(rebuildPipelineForProfilePetType).toHaveBeenCalledWith(
      expect.anything(),
      'dog',
    );
    await expect(loadLocalPetProfile(storage)).resolves.toMatchObject({
      type: 'dog',
    });
    expect(storage.setItemAsync).toHaveBeenCalledWith(
      LOCAL_PET_PROFILE_KEY,
      expect.stringContaining('"type":"dog"'),
    );
  });
});
