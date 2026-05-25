import type * as SQLite from 'expo-sqlite';
import {
  encodeEventUpdateCursor,
  type BootstrapTimelineEvent,
} from '@tailo/shared';

import { logTailo } from '@/lib/tailoLogger';
import {
  getSyncStateValue,
  setSyncStateValue,
  SYNC_STATE_KEYS,
} from '@/db/syncState';
import {
  fetchBootstrapPage,
  upsertHydratedCloudEvent,
} from './hydratedCloudEvents';

export async function getCloudHydratedEventCount(
  database: SQLite.SQLiteDatabase,
): Promise<number> {
  const row = await database.getFirstAsync<{ count: number }>(`
    SELECT COUNT(*) AS count
    FROM local_events
    WHERE deleted_at IS NULL
      AND remote_event_id IS NOT NULL
      AND processing_state = 'processed'
  `);

  return Number(row?.count ?? 0);
}

export async function countLocalProcessedTimelineEvents(
  database: SQLite.SQLiteDatabase,
): Promise<number> {
  const row = await database.getFirstAsync<{ count: number }>(`
    SELECT COUNT(*) AS count
    FROM local_events
    WHERE deleted_at IS NULL
      AND processing_state = 'processed'
  `);

  return Number(row?.count ?? 0);
}

export type HydrateCloudTimelineResult =
  | { status: 'skipped' }
  | { status: 'already_hydrated' }
  | { status: 'hydrated'; eventCount: number }
  | { status: 'error'; message: string };

export type HydrateCloudTimelineOptions = {
  /** Backfill from cloud even if this workspace already has hydrated moments. */
  force?: boolean;
};

/**
 * Pulls cloud moments into SQLite when this device has no hydrated timeline yet.
 */
export async function hydrateCloudTimelineIfNeeded(
  database: SQLite.SQLiteDatabase,
  petId: string,
  options: HydrateCloudTimelineOptions = {},
): Promise<HydrateCloudTimelineResult> {
  const existingCount = await getCloudHydratedEventCount(database);

  if (!options.force && existingCount > 0) {
    return { status: 'already_hydrated' };
  }

  let cursor: string | null = null;
  let totalEvents = 0;
  let latestCursorEvent: BootstrapTimelineEvent | null = null;
  let exhaustedBootstrap = false;

  for (let page = 0; page < 50; page += 1) {
    const pageResult = await fetchBootstrapPage(cursor);

    if (pageResult.status === 'error') {
      return pageResult;
    }

    for (const event of pageResult.events) {
      if (event.pet_id !== petId) {
        continue;
      }

      await upsertHydratedCloudEvent(database, event);
      totalEvents += 1;

      if (
        !latestCursorEvent ||
        event.updated_at > latestCursorEvent.updated_at
      ) {
        latestCursorEvent = event;
      }
    }

    if (!pageResult.nextCursor) {
      exhaustedBootstrap = true;
      break;
    }

    cursor = pageResult.nextCursor;
  }

  if (latestCursorEvent) {
    await setSyncStateValue(
      database,
      SYNC_STATE_KEYS.EVENTS_CURSOR,
      encodeEventUpdateCursor({
        updatedAt: latestCursorEvent.updated_at,
        eventId: latestCursorEvent.event_id,
      }),
    );
  } else {
    const existingCursor = await getSyncStateValue(
      database,
      SYNC_STATE_KEYS.EVENTS_CURSOR,
    );

    if (!existingCursor) {
      await setSyncStateValue(database, SYNC_STATE_KEYS.EVENTS_CURSOR, '');
    }
  }

  await setSyncStateValue(
    database,
    SYNC_STATE_KEYS.BOOTSTRAP_BACKFILL_CURSOR,
    exhaustedBootstrap ? '' : (cursor ?? ''),
  );
  await setSyncStateValue(
    database,
    SYNC_STATE_KEYS.BOOTSTRAP_BACKFILL_COMPLETED,
    exhaustedBootstrap ? '1' : '0',
  );

  logTailo('Sync', 'Cloud timeline hydrated on device', {
    eventCount: totalEvents,
  });

  return { status: 'hydrated', eventCount: totalEvents };
}
