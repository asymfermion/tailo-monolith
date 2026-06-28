import * as MediaLibrary from 'expo-media-library/legacy';
import type * as SQLite from 'expo-sqlite';

import { isDeviceMediaUri } from '@/lib/deviceMediaUri';
import { logTailo } from '@/lib/tailoLogger';

type CloudOverwrittenAssetRow = {
  localAssetId: string;
  uri: string;
  createdAt: string;
};

type CandidateTimestampRow = {
  localEventId: string;
  candidateTimestamp: string;
  eventTimestamp: string;
};

/**
 * Repairs timeline rows after cloud hydrate overwrote local photo URIs or timestamps
 * on the same device (typical after email link + forced restore).
 */
export async function repairHydratedTimelineData(
  database: SQLite.SQLiteDatabase,
): Promise<{ repairedAssetUris: number; repairedEventTimestamps: number }> {
  const repairedAssetUris = await repairCloudOverwrittenAssetUris(database);
  const repairedEventTimestamps =
    await repairCloudOverwrittenEventTimestamps(database);

  if (repairedAssetUris > 0 || repairedEventTimestamps > 0) {
    logTailo('Sync', 'Repaired hydrated timeline data', {
      repairedAssetUris,
      repairedEventTimestamps,
    });
  }

  return { repairedAssetUris, repairedEventTimestamps };
}

async function repairCloudOverwrittenAssetUris(
  database: SQLite.SQLiteDatabase,
): Promise<number> {
  const rows = await database.getAllAsync<CloudOverwrittenAssetRow>(`
    SELECT
      local_asset_id AS localAssetId,
      uri,
      created_at AS createdAt
    FROM local_assets
    WHERE uri LIKE 'http://%'
       OR uri LIKE 'https://%'
  `);

  if (rows.length === 0) {
    return 0;
  }

  const isAvailable = await MediaLibrary.isAvailableAsync();

  if (!isAvailable) {
    return 0;
  }

  let repaired = 0;

  for (const row of rows) {
    if (isDeviceMediaUri(row.uri)) {
      continue;
    }

    try {
      const info = await MediaLibrary.getAssetInfoAsync(row.localAssetId);

      if (!info.uri || !isDeviceMediaUri(info.uri)) {
        continue;
      }

      const createdAt =
        info.creationTime > 0
          ? new Date(info.creationTime).toISOString()
          : row.createdAt;

      await database.runAsync(
        `
          UPDATE local_assets
          SET uri = ?, created_at = ?, updated_at = CURRENT_TIMESTAMP
          WHERE local_asset_id = ?
            AND (uri LIKE 'http://%' OR uri LIKE 'https://%')
        `,
        [info.uri, createdAt, row.localAssetId],
      );
      repaired += 1;
    } catch {
      // Asset may no longer exist on device — keep cloud URI.
    }
  }

  return repaired;
}

async function repairCloudOverwrittenEventTimestamps(
  database: SQLite.SQLiteDatabase,
): Promise<number> {
  const rows = await database.getAllAsync<CandidateTimestampRow>(`
    SELECT
      events.local_event_id AS localEventId,
      candidates.timestamp AS candidateTimestamp,
      events.timestamp AS eventTimestamp
    FROM local_events AS events
    INNER JOIN local_event_candidates AS candidates
      ON candidates.local_event_id = events.local_event_id
    WHERE events.processing_state = 'processed'
      AND events.deleted_at IS NULL
      AND candidates.timestamp != events.timestamp
  `);

  let repaired = 0;

  for (const row of rows) {
    await database.runAsync(
      `
        UPDATE local_events
        SET timestamp = ?, updated_at = CURRENT_TIMESTAMP
        WHERE local_event_id = ?
      `,
      [row.candidateTimestamp, row.localEventId],
    );
    repaired += 1;
  }

  if (repaired > 0) {
    return repaired;
  }

  return 0;
}
