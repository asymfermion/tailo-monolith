import type * as SQLite from 'expo-sqlite';

import type { EventType } from '@tailo/shared';

import type { LocalPetType } from '@/modules/pets';
import type { NewLocalEvent } from '@/types';

export type CaptionSource = 'user' | 'ai' | 'placeholder';

export type LocalEventUpdate = {
  eventType?: EventType;
  caption?: string | null;
  isFavorite?: boolean;
  userEditedCaption?: boolean;
  userEditedEventType?: boolean;
  captionSource?: CaptionSource;
};

export type LocalEventRow = {
  localEventId: string;
  petId: string;
  timestamp: string;
  source: NewLocalEvent['source'];
  eventType: EventType;
  caption: string | null;
  captionLanguage: string | null;
  confidence: number | null;
  isFavorite: number;
  processingState: string;
  selectedAssetIds: string;
  remoteEventId: string | null;
  serverSyncVersion: number;
  captionSource: CaptionSource | null;
  userEditedCaption: number;
  userEditedEventType: number;
  pendingAi: number;
  syncLockOwner: EventSyncLockOwner | null;
  pendingCloudSync: number;
  deletedAt: string | null;
};

export type EventSyncLockOwner = 'user' | 'ai';

const UPSERT_LOCAL_EVENT_SQL = `
  INSERT INTO local_events (
    local_event_id,
    pet_id,
    timestamp,
    source,
    event_type,
    caption,
    caption_language,
    confidence,
    is_favorite,
    processing_state,
    selected_asset_ids
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(local_event_id) DO UPDATE SET
    pet_id = excluded.pet_id,
    timestamp = excluded.timestamp,
    source = excluded.source,
    event_type = excluded.event_type,
    caption = excluded.caption,
    caption_language = excluded.caption_language,
    confidence = excluded.confidence,
    is_favorite = excluded.is_favorite,
    processing_state = excluded.processing_state,
    selected_asset_ids = excluded.selected_asset_ids,
    updated_at = CURRENT_TIMESTAMP
`;

export async function upsertLocalEvents(
  db: SQLite.SQLiteDatabase,
  events: NewLocalEvent[],
): Promise<number> {
  for (const event of events) {
    await db.runAsync(UPSERT_LOCAL_EVENT_SQL, [
      event.localEventId,
      event.petId,
      event.timestamp,
      event.source,
      event.eventType ?? 'unknown',
      event.caption ?? null,
      event.captionLanguage ?? null,
      event.confidence ?? null,
      event.isFavorite ? 1 : 0,
      event.processingState ?? 'processed',
      JSON.stringify(event.selectedAssetIds),
    ]);
  }

  return events.length;
}

export type PromotableEventCandidateRow = {
  localEventId: string;
  timestamp: string;
  source: NewLocalEvent['source'];
  selectedAssetIds: string;
};

export async function getPromotableEventCandidates(
  db: SQLite.SQLiteDatabase,
): Promise<PromotableEventCandidateRow[]> {
  return db.getAllAsync<PromotableEventCandidateRow>(`
    SELECT
      candidates.local_event_id AS localEventId,
      candidates.timestamp,
      candidates.source,
      candidates.selected_asset_ids AS selectedAssetIds
    FROM local_event_candidates AS candidates
    WHERE candidates.candidate_status IN ('scored', 'ready')
      AND candidates.processing_state IN ('pending', 'processing', 'processed')
      AND NOT EXISTS (
        SELECT 1
        FROM local_events AS events
        WHERE events.local_event_id = candidates.local_event_id
          AND events.processing_state = 'processed'
      )
  `);
}

/** ISO timestamp of the newest promoted timeline moment, if any. */
export async function getNewestPromotedEventTimestamp(
  db: SQLite.SQLiteDatabase,
): Promise<string | null> {
  const row = await db.getFirstAsync<{ timestamp: string }>(`
    SELECT timestamp
    FROM local_events
    WHERE processing_state = 'processed'
    ORDER BY timestamp DESC
    LIMIT 1
  `);

  return row?.timestamp ?? null;
}

export async function getLocalEventCount(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(*) AS count
    FROM local_events
    WHERE deleted_at IS NULL
  `);

  return Number(row?.count ?? 0);
}

/**
 * Largest promoted-moment count for any single detected pet type.
 * Uses each event's primary asset pet type and does not sum dog+cat together.
 */
export async function getMaxLocalEventCountByDetectedPetType(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(`
    SELECT COALESCE(MAX(type_count), 0) AS count
    FROM (
      SELECT
        assets.detected_pet_type,
        COUNT(DISTINCT events.local_event_id) AS type_count
      FROM local_events AS events
      INNER JOIN local_media_scores AS scores
        ON scores.local_event_id = events.local_event_id
      INNER JOIN local_assets AS assets
        ON assets.local_asset_id = scores.local_asset_id
      WHERE events.deleted_at IS NULL
        AND scores.is_primary = 1
        AND assets.is_pet_candidate = 1
        AND assets.detected_pet_type IN ('dog', 'cat')
      GROUP BY assets.detected_pet_type
    ) AS grouped
  `);

  return Number(row?.count ?? 0);
}

export async function getLocalEventCountByDetectedPetType(
  db: SQLite.SQLiteDatabase,
  petType: LocalPetType,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(DISTINCT events.local_event_id) AS count
      FROM local_events AS events
      INNER JOIN local_media_scores AS scores
        ON scores.local_event_id = events.local_event_id
      INNER JOIN local_assets AS assets
        ON assets.local_asset_id = scores.local_asset_id
      WHERE events.deleted_at IS NULL
        AND scores.is_primary = 1
        AND assets.is_pet_candidate = 1
        AND assets.detected_pet_type = ?
    `,
    [petType],
  );

  return Number(row?.count ?? 0);
}

/**
 * Largest promoted-moment count for any single detected pet type where the
 * primary image meets a minimum overall media score.
 */
export async function getMaxQualifiedLocalEventCountByDetectedPetType(
  db: SQLite.SQLiteDatabase,
  minPrimaryOverallScore: number,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COALESCE(MAX(type_count), 0) AS count
      FROM (
        SELECT
          assets.detected_pet_type,
          COUNT(DISTINCT events.local_event_id) AS type_count
        FROM local_events AS events
        INNER JOIN local_media_scores AS scores
          ON scores.local_event_id = events.local_event_id
        INNER JOIN local_assets AS assets
          ON assets.local_asset_id = scores.local_asset_id
        WHERE events.deleted_at IS NULL
          AND scores.is_primary = 1
          AND scores.overall_score >= ?
          AND assets.is_pet_candidate = 1
          AND assets.detected_pet_type IN ('dog', 'cat')
        GROUP BY assets.detected_pet_type
      ) AS grouped
    `,
    [minPrimaryOverallScore],
  );

  return Number(row?.count ?? 0);
}

export async function getQualifiedLocalEventCountByDetectedPetType(
  db: SQLite.SQLiteDatabase,
  petType: LocalPetType,
  minPrimaryOverallScore: number,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(DISTINCT events.local_event_id) AS count
      FROM local_events AS events
      INNER JOIN local_media_scores AS scores
        ON scores.local_event_id = events.local_event_id
      INNER JOIN local_assets AS assets
        ON assets.local_asset_id = scores.local_asset_id
      WHERE events.deleted_at IS NULL
        AND scores.is_primary = 1
        AND scores.overall_score >= ?
        AND assets.is_pet_candidate = 1
        AND assets.detected_pet_type = ?
    `,
    [minPrimaryOverallScore, petType],
  );

  return Number(row?.count ?? 0);
}

export async function getLocalEventById(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
): Promise<LocalEventRow | null> {
  return db.getFirstAsync<LocalEventRow>(
    `
      SELECT
        local_event_id AS localEventId,
        pet_id AS petId,
        timestamp,
        source,
        event_type AS eventType,
        caption,
        caption_language AS captionLanguage,
        confidence,
        is_favorite AS isFavorite,
        processing_state AS processingState,
        selected_asset_ids AS selectedAssetIds,
        remote_event_id AS remoteEventId,
        server_sync_version AS serverSyncVersion,
        caption_source AS captionSource,
        user_edited_caption AS userEditedCaption,
        user_edited_event_type AS userEditedEventType,
        pending_ai AS pendingAi,
        sync_lock_owner AS syncLockOwner,
        pending_cloud_sync AS pendingCloudSync,
        deleted_at AS deletedAt
      FROM local_events
      WHERE local_event_id = ?
    `,
    [localEventId],
  );
}

export async function listLocalEventIdsPendingCloudSync(
  db: SQLite.SQLiteDatabase,
  limit = 50,
): Promise<string[]> {
  const rows = await db.getAllAsync<{ localEventId: string }>(
    `
      SELECT local_event_id AS localEventId
      FROM local_events
      WHERE pending_cloud_sync = 1
        AND processing_state = 'processed'
        AND deleted_at IS NULL
      ORDER BY updated_at ASC
      LIMIT ?
    `,
    [limit],
  );

  return rows.map((row) => row.localEventId);
}

export async function clearLocalEventPendingCloudSync(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
): Promise<void> {
  await db.runAsync(
    `
      UPDATE local_events
      SET
        pending_cloud_sync = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE local_event_id = ?
    `,
    [localEventId],
  );
}

export async function clearLocalEvents(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  await db.execAsync('DELETE FROM local_events;');
}

export async function listLocalEventsForWipe(
  db: SQLite.SQLiteDatabase,
): Promise<LocalEventRow[]> {
  return db.getAllAsync<LocalEventRow>(
    `
      SELECT
        local_event_id AS localEventId,
        pet_id AS petId,
        timestamp,
        source,
        event_type AS eventType,
        caption,
        caption_language AS captionLanguage,
        confidence,
        is_favorite AS isFavorite,
        processing_state AS processingState,
        selected_asset_ids AS selectedAssetIds,
        remote_event_id AS remoteEventId,
        server_sync_version AS serverSyncVersion,
        caption_source AS captionSource,
        user_edited_caption AS userEditedCaption,
        user_edited_event_type AS userEditedEventType,
        pending_ai AS pendingAi,
        sync_lock_owner AS syncLockOwner,
        pending_cloud_sync AS pendingCloudSync,
        deleted_at AS deletedAt
      FROM local_events
      WHERE deleted_at IS NULL
    `,
  );
}

/** Hides a moment from the timeline without removing local media (cloud reject or future user delete). */
export async function markLocalEventDeleted(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
  deletedAt: string,
): Promise<void> {
  await db.runAsync(
    `
      UPDATE local_events
      SET
        deleted_at = ?,
        pending_ai = 0,
        pending_cloud_sync = 0,
        sync_lock_owner = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE local_event_id = ?
    `,
    [deletedAt, localEventId],
  );
}

/** Removes a promoted timeline moment and its scores (hard delete). */
export async function deletePromotedLocalEvent(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
): Promise<void> {
  await db.runAsync(`DELETE FROM local_media_scores WHERE local_event_id = ?`, [
    localEventId,
  ]);
  await db.runAsync(`DELETE FROM local_events WHERE local_event_id = ?`, [
    localEventId,
  ]);
}

export type PruneLocalTimelineResult = {
  removedEventCount: number;
  removedScoreCount: number;
};

/**
 * Drops promoted moments that are not for the chosen pet type. Also removes
 * scored media rows for other types so background scans cannot surface them.
 */
export async function pruneLocalTimelineForProfilePetType(
  db: SQLite.SQLiteDatabase,
  profilePetType: LocalPetType,
): Promise<PruneLocalTimelineResult> {
  const scoreResult = await db.runAsync(
    `
      DELETE FROM local_media_scores
      WHERE local_asset_id IN (
        SELECT local_asset_id
        FROM local_assets
        WHERE is_pet_candidate = 0
          OR detected_pet_type IS NULL
          OR detected_pet_type != ?
      )
    `,
    [profilePetType],
  );

  const eventResult = await db.runAsync(
    `
      DELETE FROM local_events
      WHERE local_event_id NOT IN (
        SELECT scores.local_event_id
        FROM local_media_scores AS scores
        INNER JOIN local_assets AS assets
          ON assets.local_asset_id = scores.local_asset_id
        WHERE scores.is_primary = 1
          AND assets.detected_pet_type = ?
          AND assets.is_pet_candidate = 1
      )
    `,
    [profilePetType],
  );

  return {
    removedEventCount: eventResult.changes,
    removedScoreCount: scoreResult.changes,
  };
}

export async function updateLocalEvent(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
  update: LocalEventUpdate,
): Promise<boolean> {
  const assignments: string[] = [];
  const values: (string | number | null)[] = [];

  if (update.eventType !== undefined) {
    assignments.push('event_type = ?');
    values.push(update.eventType);
  }

  if (update.caption !== undefined) {
    assignments.push('caption = ?');
    values.push(update.caption);
  }

  if (update.isFavorite !== undefined) {
    assignments.push('is_favorite = ?');
    values.push(update.isFavorite ? 1 : 0);
  }

  if (update.userEditedCaption !== undefined) {
    assignments.push('user_edited_caption = ?');
    values.push(update.userEditedCaption ? 1 : 0);
  }

  if (update.userEditedEventType !== undefined) {
    assignments.push('user_edited_event_type = ?');
    values.push(update.userEditedEventType ? 1 : 0);
  }

  if (update.captionSource !== undefined) {
    assignments.push('caption_source = ?');
    values.push(update.captionSource);
  }

  if (assignments.length === 0) {
    return false;
  }

  assignments.push('pending_cloud_sync = 1');
  assignments.push("sync_lock_owner = 'user'");
  assignments.push('updated_at = CURRENT_TIMESTAMP');
  values.push(localEventId);

  const result = await db.runAsync(
    `UPDATE local_events SET ${assignments.join(', ')} WHERE local_event_id = ?`,
    values,
  );

  return result.changes > 0;
}
