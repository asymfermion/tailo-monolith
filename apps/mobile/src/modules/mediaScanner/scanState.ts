import { workspaceSecureStorage } from '@/modules/auth/localWorkspace';
import { type SecureStorage } from '@/modules/auth/secureStorage';

export const LAST_SCAN_TIMESTAMP_KEY = 'tailo.last_scan_timestamp';
export const HISTORICAL_BACKFILL_COMPLETED_KEY =
  'tailo.historical_backfill_completed';

export async function getLastScanTimestamp(
  storage: SecureStorage = workspaceSecureStorage,
): Promise<string | null> {
  return storage.getItemAsync(LAST_SCAN_TIMESTAMP_KEY);
}

export async function setLastScanTimestamp(
  timestamp: string,
  storage: SecureStorage = workspaceSecureStorage,
): Promise<void> {
  await storage.setItemAsync(LAST_SCAN_TIMESTAMP_KEY, timestamp);
}

export async function hasCompletedHistoricalBackfill(
  storage: SecureStorage = workspaceSecureStorage,
): Promise<boolean> {
  return (
    (await storage.getItemAsync(HISTORICAL_BACKFILL_COMPLETED_KEY)) === '1'
  );
}

export async function setHistoricalBackfillCompleted(
  completed: boolean,
  storage: SecureStorage = workspaceSecureStorage,
): Promise<void> {
  await storage.setItemAsync(
    HISTORICAL_BACKFILL_COMPLETED_KEY,
    completed ? '1' : '0',
  );
}
