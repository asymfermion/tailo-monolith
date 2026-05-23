import { workspaceSecureStorage } from '@/modules/auth/localWorkspace';
import { type SecureStorage } from '@/modules/auth/secureStorage';

export const LAST_SCAN_TIMESTAMP_KEY = 'tailo.last_scan_timestamp';

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
