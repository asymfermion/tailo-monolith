import type * as SQLite from 'expo-sqlite';

import { getCloudHydratedEventCount } from '@/modules/sync/hydrateCloudTimeline';
import {
  getSyncStateValue,
  setSyncStateValue,
  SYNC_STATE_KEYS,
} from '@/db/syncState';

import {
  fetchBootstrapPage,
  hydrateRemoteEventsBySourceLocalEventIds,
  upsertHydratedCloudEvent,
} from './hydratedCloudEvents';

const THUMBNAIL_REFRESH_INTERVAL_MS = 45 * 60 * 1000;

export async function runHydratedTimelineBackfillPass(
  database: SQLite.SQLiteDatabase,
): Promise<{ hydratedCount: number; completed: boolean }> {
  const hydratedCount = await getCloudHydratedEventCount(database);

  if (hydratedCount === 0) {
    return { hydratedCount: 0, completed: false };
  }

  const completed = await getSyncStateValue(
    database,
    SYNC_STATE_KEYS.BOOTSTRAP_BACKFILL_COMPLETED,
  );

  if (completed === '1') {
    return { hydratedCount: 0, completed: true };
  }

  const cursor = await getSyncStateValue(
    database,
    SYNC_STATE_KEYS.BOOTSTRAP_BACKFILL_CURSOR,
  );
  const pageResult = await fetchBootstrapPage(cursor);

  if (pageResult.status === 'error') {
    return { hydratedCount: 0, completed: false };
  }

  let upserts = 0;

  for (const event of pageResult.events) {
    await upsertHydratedCloudEvent(database, event);
    upserts += 1;
  }

  if (pageResult.nextCursor) {
    await setSyncStateValue(
      database,
      SYNC_STATE_KEYS.BOOTSTRAP_BACKFILL_CURSOR,
      pageResult.nextCursor,
    );
    await setSyncStateValue(
      database,
      SYNC_STATE_KEYS.BOOTSTRAP_BACKFILL_COMPLETED,
      '0',
    );

    return { hydratedCount: upserts, completed: false };
  }

  await setSyncStateValue(
    database,
    SYNC_STATE_KEYS.BOOTSTRAP_BACKFILL_CURSOR,
    '',
  );
  await setSyncStateValue(
    database,
    SYNC_STATE_KEYS.BOOTSTRAP_BACKFILL_COMPLETED,
    '1',
  );

  return { hydratedCount: upserts, completed: true };
}

export async function refreshHydratedTimelineThumbnailsIfNeeded(
  database: SQLite.SQLiteDatabase,
): Promise<number> {
  const hydratedCount = await getCloudHydratedEventCount(database);

  if (hydratedCount === 0) {
    return 0;
  }

  const lastRefreshedAt = await getSyncStateValue(
    database,
    SYNC_STATE_KEYS.THUMBNAIL_REFRESHED_AT,
  );
  const lastRefreshedAtMs = lastRefreshedAt
    ? Number.parseInt(lastRefreshedAt, 10)
    : 0;

  if (
    Number.isFinite(lastRefreshedAtMs) &&
    lastRefreshedAtMs > 0 &&
    Date.now() - lastRefreshedAtMs < THUMBNAIL_REFRESH_INTERVAL_MS
  ) {
    return 0;
  }

  const rows = await database.getAllAsync<{ sourceLocalEventId: string }>(
    `
      SELECT DISTINCT events.local_event_id AS sourceLocalEventId
      FROM local_events AS events
      INNER JOIN local_media_scores AS scores
        ON scores.local_event_id = events.local_event_id
      INNER JOIN local_assets AS assets
        ON assets.local_asset_id = scores.local_asset_id
      WHERE events.remote_event_id IS NOT NULL
        AND events.deleted_at IS NULL
        AND (assets.uri LIKE 'http://%' OR assets.uri LIKE 'https://%')
      ORDER BY events.timestamp DESC
      LIMIT 25
    `,
  );

  if (rows.length === 0) {
    await setSyncStateValue(
      database,
      SYNC_STATE_KEYS.THUMBNAIL_REFRESHED_AT,
      String(Date.now()),
    );
    return 0;
  }

  const hydrated = await hydrateRemoteEventsBySourceLocalEventIds(
    database,
    rows.map((row) => row.sourceLocalEventId),
  );

  if (hydrated.status !== 'ok') {
    return 0;
  }

  await setSyncStateValue(
    database,
    SYNC_STATE_KEYS.THUMBNAIL_REFRESHED_AT,
    String(Date.now()),
  );

  return hydrated.hydratedCount;
}
