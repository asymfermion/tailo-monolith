import * as SecureStore from 'expo-secure-store';

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/** Expo SecureStore limit on iOS Keychain (see expo-secure-store docs). */
const SECURE_STORE_VALUE_LIMIT_BYTES = 2048;

export type SecureStorage = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (
    key: string,
    value: string,
    options?: SecureStore.SecureStoreOptions,
  ) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

/** iOS Keychain rejects access while backgrounded or before first unlock. */
export function isSecureStoreInteractionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes('User interaction is not allowed') ||
    message.includes('errSecInteractionNotAllowed') ||
    message.includes('kSecErrInteractionNotAllowed')
  );
}

async function safeGetItemAsync(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    if (isSecureStoreInteractionError(error)) {
      return null;
    }

    throw error;
  }
}

async function safeSetItemAsync(
  key: string,
  value: string,
  options: SecureStore.SecureStoreOptions = SECURE_STORE_OPTIONS,
): Promise<void> {
  if (__DEV__ && value.length > SECURE_STORE_VALUE_LIMIT_BYTES) {
    console.warn(
      `[Tailo] SecureStore value for "${key}" is ${value.length} bytes (limit ${SECURE_STORE_VALUE_LIMIT_BYTES}). Use AsyncStorage for large blobs.`,
    );
  }

  try {
    await SecureStore.setItemAsync(key, value, options);
  } catch (error) {
    if (isSecureStoreInteractionError(error)) {
      return;
    }

    throw error;
  }
}

async function safeDeleteItemAsync(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    if (isSecureStoreInteractionError(error)) {
      return;
    }

    throw error;
  }
}

export const secureStorage: SecureStorage = {
  getItemAsync: safeGetItemAsync,
  setItemAsync: safeSetItemAsync,
  deleteItemAsync: safeDeleteItemAsync,
};
