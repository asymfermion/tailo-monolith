import * as SecureStore from 'expo-secure-store';

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export type SecureStorage = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (
    key: string,
    value: string,
    options?: SecureStore.SecureStoreOptions,
  ) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

export const secureStorage: SecureStorage = {
  getItemAsync: SecureStore.getItemAsync,
  setItemAsync: (key, value, options = SECURE_STORE_OPTIONS) =>
    SecureStore.setItemAsync(key, value, options),
  deleteItemAsync: SecureStore.deleteItemAsync,
};
