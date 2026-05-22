import type * as SQLite from 'expo-sqlite';

import { getNewestPromotedEventTimestamp } from '@/db/localEvents';
import type { SecureStorage } from '@/modules/auth/secureStorage';

import { getLastScanTimestamp } from './scanState';

function parseTimestampMs(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Media-library `createdAfter` for incremental rescans: photos newer than the
 * latest timeline moment and/or the last successful scan batch.
 */
export async function resolveIncrementalScanCreatedAfterMs(
  database: SQLite.SQLiteDatabase,
  storage?: SecureStorage,
): Promise<number | null> {
  const [newestEventTimestamp, lastScanTimestamp] = await Promise.all([
    getNewestPromotedEventTimestamp(database),
    getLastScanTimestamp(storage),
  ]);

  const candidates: number[] = [];

  if (newestEventTimestamp) {
    const eventMs = parseTimestampMs(newestEventTimestamp);
    if (eventMs != null) {
      candidates.push(eventMs);
    }
  }

  if (lastScanTimestamp) {
    const scanMs = parseTimestampMs(lastScanTimestamp);
    if (scanMs != null) {
      candidates.push(scanMs);
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  return Math.max(...candidates);
}
