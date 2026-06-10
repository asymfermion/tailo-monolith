import * as FileSystem from 'expo-file-system/legacy';

import { invalidateDatabaseConnection } from '@/db';

import { deleteRemoteAccountIfPossible } from './deleteRemoteAccount';
import { notifyAuthSessionChanged } from './authSessionEvents';
import { clearSecureUserData } from './installIdentity';
import { initialOnboardingState, saveOnboardingState } from './onboardingState';
import { secureStorage } from './secureStorage';

export type ResetLocalDeviceDataOptions = {
  /** Also delete the signed-in Tailo cloud account and Supabase auth user. */
  deleteRemoteAccount?: boolean;
};

export async function deleteAllLocalDatabaseFiles(): Promise<void> {
  const documentDirectory = FileSystem.documentDirectory;

  if (!documentDirectory) {
    return;
  }

  const sqliteDirectory = `${documentDirectory}SQLite`;
  const directoryInfo = await FileSystem.getInfoAsync(sqliteDirectory);

  if (!directoryInfo.exists) {
    return;
  }

  const entries = await FileSystem.readDirectoryAsync(sqliteDirectory);

  await Promise.all(
    entries.filter(isTailoDatabaseFile).map((name) =>
      FileSystem.deleteAsync(`${sqliteDirectory}/${name}`, {
        idempotent: true,
      }),
    ),
  );
}

function isTailoDatabaseFile(name: string): boolean {
  return (
    name.startsWith('tailo') &&
    (name.endsWith('.db') ||
      name.endsWith('.db-wal') ||
      name.endsWith('.db-shm'))
  );
}

/**
 * Developer-only reset: wipe local SQLite and clear SecureStore via the same
 * path used when reinstall detection finds stale Keychain data.
 */
export async function resetLocalDeviceData(
  options: ResetLocalDeviceDataOptions = {},
): Promise<void> {
  if (options.deleteRemoteAccount) {
    const remoteResult = await deleteRemoteAccountIfPossible();

    if (remoteResult.status === 'error') {
      throw new Error(remoteResult.message);
    }
  }

  await invalidateDatabaseConnection();
  await deleteAllLocalDatabaseFiles();
  await clearSecureUserData(secureStorage);
  await saveOnboardingState(initialOnboardingState);
  notifyAuthSessionChanged();
}
