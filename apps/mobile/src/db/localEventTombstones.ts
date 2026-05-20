import type * as SQLite from 'expo-sqlite';

export type LocalEventTombstoneRow = {
  sourceLocalEventId: string;
  remoteEventId: string | null;
  wipedAt: string;
  timelineGeneration: number;
};

export async function tombstoneLocalEvents(
  db: SQLite.SQLiteDatabase,
  events: Array<{ localEventId: string; remoteEventId: string | null }>,
  timelineGeneration: number,
  wipedAt: string,
): Promise<number> {
  let count = 0;

  for (const event of events) {
    await db.runAsync(
      `
        INSERT INTO local_event_tombstones (
          source_local_event_id,
          remote_event_id,
          wiped_at,
          timeline_generation
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(source_local_event_id) DO UPDATE SET
          remote_event_id = excluded.remote_event_id,
          wiped_at = excluded.wiped_at,
          timeline_generation = excluded.timeline_generation
      `,
      [event.localEventId, event.remoteEventId, wipedAt, timelineGeneration],
    );
    count += 1;
  }

  return count;
}

export async function isLocalEventTombstoned(
  db: SQLite.SQLiteDatabase,
  sourceLocalEventId: string,
): Promise<boolean> {
  const row = await db.getFirstAsync<{ sourceLocalEventId: string }>(
    `
      SELECT source_local_event_id AS sourceLocalEventId
      FROM local_event_tombstones
      WHERE source_local_event_id = ?
      LIMIT 1
    `,
    [sourceLocalEventId],
  );

  return row !== null;
}

export async function clearLocalEventTombstone(
  db: SQLite.SQLiteDatabase,
  sourceLocalEventId: string,
): Promise<void> {
  await db.runAsync(
    `DELETE FROM local_event_tombstones WHERE source_local_event_id = ?`,
    [sourceLocalEventId],
  );
}
