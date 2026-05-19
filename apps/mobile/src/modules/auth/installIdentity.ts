import type * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';

import { countLocalAssets } from '@/db/localAssets';
import {
  getSyncStateValue,
  setSyncStateValue,
  SYNC_STATE_KEYS,
} from '@/db/syncState';
import { LOCAL_PET_PROFILE_KEY } from '@/modules/pets/keys';
import { LAST_SCAN_TIMESTAMP_KEY } from '@/modules/mediaScanner/scanState';

import { ANONYMOUS_USER_ID_KEY } from './identity';
import { ONBOARDING_STATE_KEY } from './onboardingState';
import { secureStorage, type SecureStorage } from './secureStorage';

export const INSTALL_ID_KEY = 'tailo.install_id';

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export type InstallReconcileResult = {
  installId: string;
  clearedStaleSecureStore: boolean;
};

/**
 * iOS Keychain (SecureStore) can survive app delete + reinstall. SQLite usually
 * does not. Tie SecureStore to the current DB install id and clear stale secrets
 * when the local database is fresh but Keychain still has prior session data.
 */
export async function reconcileInstallIdentity(
  db: SQLite.SQLiteDatabase,
  storage: SecureStorage = secureStorage,
): Promise<InstallReconcileResult> {
  const dbInstallId = await getSyncStateValue(
    db,
    SYNC_STATE_KEYS.APP_INSTALL_ID,
  );
  const secureInstallId = await storage.getItemAsync(INSTALL_ID_KEY);

  if (!dbInstallId) {
    const hasLocalData = (await countLocalAssets(db)) > 0;
    const hasStaleSecureData = await hasSecureUserData(storage);

    if (!hasLocalData && hasStaleSecureData) {
      await clearSecureUserData(storage);
      const installId = generateInstallId();
      await persistInstallId(db, storage, installId);
      return { installId, clearedStaleSecureStore: true };
    }

    const installId = secureInstallId ?? generateInstallId();
    await persistInstallId(db, storage, installId);
    return { installId, clearedStaleSecureStore: false };
  }

  if (secureInstallId !== dbInstallId) {
    await clearSecureUserData(storage);
    await persistInstallId(db, storage, dbInstallId);
    return { installId: dbInstallId, clearedStaleSecureStore: true };
  }

  if (!secureInstallId) {
    await storage.setItemAsync(
      INSTALL_ID_KEY,
      dbInstallId,
      SECURE_STORE_OPTIONS,
    );
  }

  return { installId: dbInstallId, clearedStaleSecureStore: false };
}

export async function clearSecureUserData(
  storage: SecureStorage = secureStorage,
): Promise<void> {
  await Promise.all(
    [
      INSTALL_ID_KEY,
      ANONYMOUS_USER_ID_KEY,
      ONBOARDING_STATE_KEY,
      LOCAL_PET_PROFILE_KEY,
      LAST_SCAN_TIMESTAMP_KEY,
    ].map((key) => storage.deleteItemAsync(key)),
  );
}

async function hasSecureUserData(storage: SecureStorage): Promise<boolean> {
  const [onboarding, profile, anonymousId] = await Promise.all([
    storage.getItemAsync(ONBOARDING_STATE_KEY),
    storage.getItemAsync(LOCAL_PET_PROFILE_KEY),
    storage.getItemAsync(ANONYMOUS_USER_ID_KEY),
  ]);

  return Boolean(onboarding ?? profile ?? anonymousId);
}

async function persistInstallId(
  db: SQLite.SQLiteDatabase,
  storage: SecureStorage,
  installId: string,
): Promise<void> {
  await setSyncStateValue(db, SYNC_STATE_KEYS.APP_INSTALL_ID, installId);
  await storage.setItemAsync(INSTALL_ID_KEY, installId, SECURE_STORE_OPTIONS);
}

export function generateInstallId(): string {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `install_${Date.now().toString(36)}_${randomPart}`;
}
