import type * as SQLite from 'expo-sqlite';

import { logForeignKeyDiagnostics } from './dbLogger';

type ExistingIdRow = {
  id: string;
};

export type UploadQueueForeignKeyReport = {
  localEventId: string;
  requestedAssetIds: string[];
  eventExists: boolean;
  existingAssetIds: string[];
  missingAssetIds: string[];
};

export async function inspectUploadQueueForeignKeys(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
  localAssetIds: string[],
): Promise<UploadQueueForeignKeyReport> {
  const uniqueAssetIds = [...new Set(localAssetIds)];

  const eventRow = await db.getFirstAsync<{ localEventId: string }>(
    `
      SELECT local_event_id AS localEventId
      FROM local_events
      WHERE local_event_id = ?
      LIMIT 1
    `,
    [localEventId],
  );

  if (uniqueAssetIds.length === 0) {
    return {
      localEventId,
      requestedAssetIds: [],
      eventExists: Boolean(eventRow),
      existingAssetIds: [],
      missingAssetIds: [],
    };
  }

  const placeholders = uniqueAssetIds.map(() => '?').join(', ');
  const assetRows = await db.getAllAsync<ExistingIdRow>(
    `
      SELECT local_asset_id AS id
      FROM local_assets
      WHERE local_asset_id IN (${placeholders})
    `,
    uniqueAssetIds,
  );
  const existingAssetIds = assetRows.map((row) => row.id);
  const existingSet = new Set(existingAssetIds);
  const missingAssetIds = uniqueAssetIds.filter(
    (assetId) => !existingSet.has(assetId),
  );

  return {
    localEventId,
    requestedAssetIds: uniqueAssetIds,
    eventExists: Boolean(eventRow),
    existingAssetIds,
    missingAssetIds,
  };
}

export function logUploadQueueForeignKeyReport(
  report: UploadQueueForeignKeyReport,
  context: string,
): void {
  logForeignKeyDiagnostics({
    context,
    localEventId: report.localEventId,
    eventExists: report.eventExists,
    requestedAssetCount: report.requestedAssetIds.length,
    existingAssetCount: report.existingAssetIds.length,
    missingAssetIds: report.missingAssetIds,
    requestedAssetIds: report.requestedAssetIds,
    existingAssetIds: report.existingAssetIds,
  });
}
