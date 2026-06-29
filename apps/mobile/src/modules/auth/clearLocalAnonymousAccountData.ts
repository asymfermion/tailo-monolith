import { invalidateDatabaseConnection } from '@/db';
import {
  HISTORICAL_BACKFILL_COMPLETED_KEY,
  LAST_SCAN_TIMESTAMP_KEY,
} from '@/modules/mediaScanner/scanState';
import { LOCAL_PET_PROFILE_KEY } from '@/modules/pets/keys';

import { ANONYMOUS_USER_ID_KEY } from './identity';
import { LOCAL_ACCOUNT_PROFILE_KEY } from './keys';
import { workspaceSecureStorage } from './localWorkspace';
import { secureStorage } from './secureStorage';
import { deleteAllLocalDatabaseFiles } from './resetLocalDeviceData';

/**
 * Clears device-local anonymous data during account-switch fallback
 * (anonymous Google link conflict -> signed in with existing account),
 * while preserving the current remote auth session.
 */
export async function clearLocalAnonymousAccountDataForAccountSwitch(): Promise<void> {
  await invalidateDatabaseConnection();
  await deleteAllLocalDatabaseFiles();

  await Promise.all([
    secureStorage.deleteItemAsync(ANONYMOUS_USER_ID_KEY),
    workspaceSecureStorage.deleteItemAsync(LOCAL_PET_PROFILE_KEY),
    workspaceSecureStorage.deleteItemAsync(LOCAL_ACCOUNT_PROFILE_KEY),
    workspaceSecureStorage.deleteItemAsync(LAST_SCAN_TIMESTAMP_KEY),
    workspaceSecureStorage.deleteItemAsync(HISTORICAL_BACKFILL_COMPLETED_KEY),
  ]);
}
