import type * as SQLite from 'expo-sqlite';

export type EventSyncLockOwner = 'user' | 'ai';

export async function acquireEventSyncLock(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
  owner: EventSyncLockOwner,
): Promise<void> {
  await db.runAsync(
    `
      UPDATE local_events
      SET
        sync_lock_owner = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE local_event_id = ?
    `,
    [owner, localEventId],
  );
}

export async function releaseEventSyncLock(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
): Promise<void> {
  await db.runAsync(
    `
      UPDATE local_events
      SET
        sync_lock_owner = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE local_event_id = ?
    `,
    [localEventId],
  );
}
