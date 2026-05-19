import type * as SQLite from 'expo-sqlite';

import type { NewUploadQueueItem, UploadQueueStatus } from '@/types';

export type UploadQueueRow = {
  id: string;
  localEventId: string;
  localAssetId: string;
  status: UploadQueueStatus;
  retryCount: number;
  lastError: string | null;
  storagePath: string | null;
  thumbnailPath: string | null;
  nextAttemptAt: string | null;
};

const UPSERT_UPLOAD_QUEUE_SQL = `
  INSERT INTO upload_queue (
    id,
    local_event_id,
    local_asset_id,
    status,
    retry_count,
    last_error
  )
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(local_event_id, local_asset_id) DO UPDATE SET
    status = CASE
      WHEN upload_queue.status = 'done' THEN upload_queue.status
      ELSE excluded.status
    END,
    updated_at = CURRENT_TIMESTAMP
`;

export function createUploadQueueItemId(
  localEventId: string,
  localAssetId: string,
): string {
  return `upload_${localEventId}_${localAssetId}`;
}

export async function enqueueUploadQueueItems(
  db: SQLite.SQLiteDatabase,
  items: NewUploadQueueItem[],
): Promise<number> {
  for (const item of items) {
    await db.runAsync(UPSERT_UPLOAD_QUEUE_SQL, [
      item.id ?? createUploadQueueItemId(item.localEventId, item.localAssetId),
      item.localEventId,
      item.localAssetId,
      item.status ?? 'pending',
      item.retryCount ?? 0,
      item.lastError ?? null,
    ]);
  }

  return items.length;
}

export async function countPendingUploadQueueItems(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(*) AS count
    FROM upload_queue
    WHERE status IN ('pending', 'failed')
  `);

  return row?.count ?? 0;
}

export async function getPendingUploadQueueItems(
  db: SQLite.SQLiteDatabase,
  limit = 100,
): Promise<UploadQueueRow[]> {
  return db.getAllAsync<UploadQueueRow>(
    `
      SELECT
        id,
        local_event_id AS localEventId,
        local_asset_id AS localAssetId,
        status,
        retry_count AS retryCount,
        last_error AS lastError,
        storage_path AS storagePath,
        thumbnail_path AS thumbnailPath,
        next_attempt_at AS nextAttemptAt
      FROM upload_queue
      WHERE status IN ('pending', 'failed')
      ORDER BY created_at ASC
      LIMIT ?
    `,
    [limit],
  );
}

export async function setUploadQueueItemStatus(
  db: SQLite.SQLiteDatabase,
  id: string,
  status: UploadQueueStatus,
): Promise<void> {
  await db.runAsync(
    `
      UPDATE upload_queue
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [status, id],
  );
}

export async function markUploadQueueItemsUploading(
  db: SQLite.SQLiteDatabase,
  ids: string[],
): Promise<void> {
  for (const id of ids) {
    await setUploadQueueItemStatus(db, id, 'uploading');
  }
}

export async function markUploadQueueItemDone(
  db: SQLite.SQLiteDatabase,
  id: string,
  storagePath: string,
  thumbnailPath: string,
): Promise<void> {
  await db.runAsync(
    `
      UPDATE upload_queue
      SET
        status = 'done',
        storage_path = ?,
        thumbnail_path = ?,
        last_error = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [storagePath, thumbnailPath, id],
  );
}

export async function markUploadQueueItemFailed(
  db: SQLite.SQLiteDatabase,
  id: string,
  lastError: string,
  retryCount: number,
  nextAttemptAt: string | null,
): Promise<void> {
  await db.runAsync(
    `
      UPDATE upload_queue
      SET
        status = 'failed',
        retry_count = ?,
        last_error = ?,
        next_attempt_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [retryCount, lastError, nextAttemptAt, id],
  );
}

export async function getDoneUploadQueueItemsForEvent(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
): Promise<UploadQueueRow[]> {
  return db.getAllAsync<UploadQueueRow>(
    `
      SELECT
        id,
        local_event_id AS localEventId,
        local_asset_id AS localAssetId,
        status,
        retry_count AS retryCount,
        last_error AS lastError,
        storage_path AS storagePath,
        thumbnail_path AS thumbnailPath,
        next_attempt_at AS nextAttemptAt
      FROM upload_queue
      WHERE local_event_id = ?
        AND status = 'done'
        AND storage_path IS NOT NULL
        AND thumbnail_path IS NOT NULL
      ORDER BY created_at ASC
    `,
    [localEventId],
  );
}

export async function resetStuckUploadingQueueItems(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  await db.runAsync(`
    UPDATE upload_queue
    SET status = 'pending', updated_at = CURRENT_TIMESTAMP
    WHERE status = 'uploading'
  `);
}

export async function clearUploadQueue(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  await db.execAsync('DELETE FROM upload_queue;');
}
