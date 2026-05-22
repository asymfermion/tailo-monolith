import type * as SQLite from 'expo-sqlite';

import { listLocalEventIdsPendingCloudSync } from '@/db/localEvents';
import { logTailo } from '@/lib/tailoLogger';

import { runEventSyncForLocalEvent } from './runEventSync';

export type RunPendingCloudSyncResult = {
  attempted: number;
  synced: number;
  skipped: number;
  errors: number;
};

export async function runPendingCloudSyncForEvent(
  database: SQLite.SQLiteDatabase,
  localEventId: string,
): Promise<{ status: 'synced' | 'skipped' | 'error'; message?: string }> {
  const result = await runEventSyncForLocalEvent(database, localEventId);

  if (result.status === 'synced') {
    logTailo('Sync', 'Moment edits synced to cloud', { localEventId });
  }

  return result;
}

export async function runPendingCloudSync(
  database: SQLite.SQLiteDatabase,
): Promise<RunPendingCloudSyncResult> {
  const localEventIds = await listLocalEventIdsPendingCloudSync(database);

  if (localEventIds.length === 0) {
    return { attempted: 0, synced: 0, skipped: 0, errors: 0 };
  }

  logTailo('Sync', 'Syncing pending moment edits to cloud', {
    pendingCount: localEventIds.length,
  });

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const localEventId of localEventIds) {
    const result = await runPendingCloudSyncForEvent(database, localEventId);

    if (result.status === 'synced') {
      synced += 1;
    } else if (result.status === 'error') {
      errors += 1;
      logTailo('Sync', 'Moment edit sync failed', {
        localEventId,
        message: result.message,
      });
    } else {
      skipped += 1;
    }
  }

  if (synced > 0 || errors > 0) {
    logTailo('Sync', 'Pending moment edit sync finished', {
      attempted: localEventIds.length,
      synced,
      skipped,
      errors,
    });
  }

  return {
    attempted: localEventIds.length,
    synced,
    skipped,
    errors,
  };
}
