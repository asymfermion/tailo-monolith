import * as SecureStore from 'expo-secure-store';

import { isSecureStoreInteractionError, secureStorage } from './secureStorage';

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('secureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detects iOS interaction-not-allowed errors', () => {
    expect(
      isSecureStoreInteractionError(
        new Error(
          "Calling the 'getValueWithKeyAsync' function has failed\n→ Caused by: User interaction is not allowed.",
        ),
      ),
    ).toBe(true);
  });

  it('returns null when getItemAsync is blocked in background', async () => {
    jest
      .mocked(SecureStore.getItemAsync)
      .mockRejectedValue(new Error('User interaction is not allowed.'));

    await expect(secureStorage.getItemAsync('tailo.test')).resolves.toBeNull();
  });

  it('ignores setItemAsync when Keychain is unavailable', async () => {
    jest
      .mocked(SecureStore.setItemAsync)
      .mockRejectedValue(new Error('User interaction is not allowed.'));

    await expect(
      secureStorage.setItemAsync('tailo.test', 'value'),
    ).resolves.toBeUndefined();
  });
});
