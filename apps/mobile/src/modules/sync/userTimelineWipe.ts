import type * as SQLite from 'expo-sqlite';

import { clearLocalEventPipeline } from '@/db/localEventCandidates';
import { listLocalEventsForWipe } from '@/db/localEvents';
import { tombstoneLocalEvents } from '@/db/localEventTombstones';
import { incrementTimelineGeneration, SYNC_STATE_KEYS } from '@/db/syncState';
import { clearUploadQueue } from '@/db/uploadQueue';

export type UserTimelineWipeResult = {
  timelineGeneration: number;
  tombstonedCount: number;
  clearedUploadQueue: boolean;
};

/**
 * User-initiated wipe (e.g. Redetect pets): tombstone all current moments so poll
 * cannot merge stale cloud rows, then clear the local pipeline.
 */
export async function recordUserTimelineWipe(
  database: SQLite.SQLiteDatabase,
): Promise<UserTimelineWipeResult> {
  const events = await listLocalEventsForWipe(database);
  const timelineGeneration = await incrementTimelineGeneration(database);
  const wipedAt = new Date().toISOString();

  const tombstonedCount = await tombstoneLocalEvents(
    database,
    events.map((event) => ({
      localEventId: event.localEventId,
      remoteEventId: event.remoteEventId,
    })),
    timelineGeneration,
    wipedAt,
  );

  await clearUploadQueue(database);
  await database.runAsync(`DELETE FROM sync_state WHERE state_key = ?`, [
    SYNC_STATE_KEYS.EVENTS_CURSOR,
  ]);
  await clearLocalEventPipeline(database);

  return {
    timelineGeneration,
    tombstonedCount,
    clearedUploadQueue: true,
  };
}
