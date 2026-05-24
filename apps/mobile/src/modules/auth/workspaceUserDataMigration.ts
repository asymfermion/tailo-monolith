import * as FileSystem from 'expo-file-system/legacy';

import { LAST_SCAN_TIMESTAMP_KEY } from '@/modules/mediaScanner/scanState';

import { LOCAL_ACCOUNT_PROFILE_KEY } from './keys';
import { logAuth } from './authLogger';
import { ONBOARDING_STATE_KEY } from './onboardingState';
import { LOCAL_PET_PROFILE_KEY } from '@/modules/pets/keys';
import type { SecureStorage } from './secureStorage';
import { secureStorage } from './secureStorage';

const WORKSPACE_SCOPED_KEYS = [
  ONBOARDING_STATE_KEY,
  LOCAL_PET_PROFILE_KEY,
  LOCAL_ACCOUNT_PROFILE_KEY,
  LAST_SCAN_TIMESTAMP_KEY,
] as const;

function workspaceStorageKey(workspaceId: string, key: string): string {
  return `tailo.workspace.${workspaceId}.${key}`;
}

function databaseFileName(workspaceId: string): string {
  return workspaceId === 'device_default'
    ? 'tailo.db'
    : `tailo.${workspaceId}.db`;
}

function sqliteDirectoryUri(): string | null {
  return FileSystem.documentDirectory
    ? `${FileSystem.documentDirectory}SQLite`
    : null;
}

/**
 * Copies workspace-scoped SecureStore keys and the local SQLite file when the
 * active workspace changes (e.g. after ensure-current-user).
 */
export async function migrateWorkspaceUserData(
  fromWorkspaceId: string,
  toWorkspaceId: string,
  storage: SecureStorage = secureStorage,
): Promise<void> {
  if (fromWorkspaceId === toWorkspaceId) {
    return;
  }

  logAuth('Migrating local workspace user data', {
    fromWorkspaceId,
    toWorkspaceId,
  });

  await Promise.all(
    WORKSPACE_SCOPED_KEYS.map(async (key) => {
      const value = await storage.getItemAsync(
        workspaceStorageKey(fromWorkspaceId, key),
      );

      if (!value) {
        return;
      }

      const destinationKey = workspaceStorageKey(toWorkspaceId, key);
      const existing = await storage.getItemAsync(destinationKey);

      if (!existing) {
        await storage.setItemAsync(destinationKey, value);
      }
    }),
  );

  const sqliteDirectory = sqliteDirectoryUri();

  if (!sqliteDirectory) {
    return;
  }

  const fromPath = `${sqliteDirectory}/${databaseFileName(fromWorkspaceId)}`;
  const toPath = `${sqliteDirectory}/${databaseFileName(toWorkspaceId)}`;
  const [fromInfo, toInfo] = await Promise.all([
    FileSystem.getInfoAsync(fromPath),
    FileSystem.getInfoAsync(toPath),
  ]);

  if (fromInfo.exists && !toInfo.exists) {
    await FileSystem.copyAsync({ from: fromPath, to: toPath });
    logAuth('Copied local workspace database', {
      from: databaseFileName(fromWorkspaceId),
      to: databaseFileName(toWorkspaceId),
    });
  }
}
