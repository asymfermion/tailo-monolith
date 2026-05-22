import type * as SQLite from 'expo-sqlite';

import { logDbInfo } from '@/db/dbLogger';
import { logTailo } from '@/lib/tailoLogger';
import { enqueueUploadQueueItems } from '@/db/uploadQueue';
import {
  inspectUploadQueueForeignKeys,
  logUploadQueueForeignKeyReport,
} from '@/db/uploadQueueDiagnostics';
import type { NewUploadQueueItem } from '@/types';

export async function enqueueEventMediaUploads(
  database: SQLite.SQLiteDatabase,
  localEventId: string,
  localAssetIds: string[],
): Promise<number> {
  const uniqueAssetIds = [...new Set(localAssetIds)];

  if (uniqueAssetIds.length === 0) {
    return 0;
  }

  const report = await inspectUploadQueueForeignKeys(
    database,
    localEventId,
    uniqueAssetIds,
  );

  if (!report.eventExists || report.missingAssetIds.length > 0) {
    logUploadQueueForeignKeyReport(report, 'enqueueEventMediaUploads');
  }

  if (!report.eventExists) {
    logDbInfo('Skipped upload_queue enqueue — local_events row missing', {
      localEventId,
    });
    return 0;
  }

  const validAssetIds = report.existingAssetIds;

  if (validAssetIds.length === 0) {
    logDbInfo('Skipped upload_queue enqueue — no local_assets rows', {
      localEventId,
      requestedAssetIds: uniqueAssetIds,
    });
    return 0;
  }

  const items: NewUploadQueueItem[] = validAssetIds.map((localAssetId) => ({
    localEventId,
    localAssetId,
    status: 'pending',
  }));

  const enqueued = await enqueueUploadQueueItems(database, items);

  logTailo('Upload', 'Queued moment media for cloud upload', {
    localEventId,
    requestedAssetCount: uniqueAssetIds.length,
    enqueuedItemCount: enqueued,
    reason:
      'Runs after local promotion; worker uploads when signed in with remote pet',
  });

  return enqueued;
}
