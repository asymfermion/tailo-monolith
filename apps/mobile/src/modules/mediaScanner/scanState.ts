import {
  secureStorage,
  type SecureStorage,
} from '@/modules/auth/secureStorage';

export const LAST_SCAN_TIMESTAMP_KEY = 'tailo.last_scan_timestamp';

export async function getLastScanTimestamp(
  storage: SecureStorage = secureStorage,
): Promise<string | null> {
  return storage.getItemAsync(LAST_SCAN_TIMESTAMP_KEY);
}

export async function setLastScanTimestamp(
  timestamp: string,
  storage: SecureStorage = secureStorage,
): Promise<void> {
  await storage.setItemAsync(LAST_SCAN_TIMESTAMP_KEY, timestamp);
}
