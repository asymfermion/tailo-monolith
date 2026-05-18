import type * as SQLite from 'expo-sqlite';

import type { NewUploadQueueItem, UploadQueueStatus } from '@/types';

export type UploadQueueRow = {
  id: string;
  localEventId: string;
  localAssetId: string;
  status: UploadQueueStatus;
  retryCount: number;
  lastError: string | null;
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
        last_error AS lastError
      FROM upload_queue
      WHERE status IN ('pending', 'failed')
      ORDER BY created_at ASC
      LIMIT ?
    `,
    [limit],
  );
}

export async function clearUploadQueue(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  await db.execAsync('DELETE FROM upload_queue;');
}
