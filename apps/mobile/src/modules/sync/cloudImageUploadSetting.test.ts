import { secureStorage } from '@/modules/auth/secureStorage';

import {
  getCloudImageUploadsEnabled,
  hydrateCloudImageUploadsEnabled,
  setCloudImageUploadsEnabled,
} from './cloudImageUploadSetting';

jest.mock('@/modules/auth/secureStorage', () => ({
  secureStorage: {
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
  },
}));

const storage = jest.mocked(secureStorage);

describe('cloudImageUploadSetting', () => {
  beforeEach(async () => {
    storage.getItemAsync.mockReset();
    storage.setItemAsync.mockReset();
    storage.deleteItemAsync.mockReset();

    storage.getItemAsync.mockResolvedValue(null);
    storage.setItemAsync.mockResolvedValue(undefined);
    storage.deleteItemAsync.mockResolvedValue(undefined);

    await setCloudImageUploadsEnabled(false);
  });

  it('defaults to disabled in dev builds when nothing is stored', async () => {
    storage.getItemAsync.mockResolvedValue(null);

    const enabled = await hydrateCloudImageUploadsEnabled();

    expect(enabled).toBe(false);
    expect(getCloudImageUploadsEnabled()).toBe(false);
  });

  it('hydrates a stored enabled value', async () => {
    storage.getItemAsync.mockResolvedValue('1');

    const enabled = await hydrateCloudImageUploadsEnabled();

    expect(enabled).toBe(true);
    expect(getCloudImageUploadsEnabled()).toBe(true);
  });

  it('persists changes when toggled', async () => {
    const enabled = await setCloudImageUploadsEnabled(true);

    expect(enabled).toBe(true);
    expect(getCloudImageUploadsEnabled()).toBe(true);
    expect(storage.setItemAsync).toHaveBeenLastCalledWith(
      'tailo.dev.cloud_image_uploads_enabled',
      '1',
    );
  });
});
