import type * as SQLite from 'expo-sqlite';
import { resolveDisplayCaption } from '@tailo/ai';
import {
  encodeEventUpdateCursor,
  isBootstrapTimelineResponse,
  type BootstrapTimelineEvent,
} from '@tailo/shared';

import { upsertLocalMediaScores } from '@/db/localMediaScores';
import { invokeTailoApi, readApiErrorMessage } from '@/lib/invokeTailoApi';
import { logTailo } from '@/lib/tailoLogger';
import {
  getSyncStateValue,
  setSyncStateValue,
  SYNC_STATE_KEYS,
} from '@/db/syncState';
import type { NewLocalAsset, NewLocalMediaScore } from '@/types';

const HYDRATED_CLOUD_SCORE = 0.85;

const UPSERT_HYDRATED_CLOUD_ASSET_SQL = `
  INSERT INTO local_assets (
    local_asset_id,
    uri,
    created_at,
    width,
    height,
    media_type,
    processing_status,
    processed_at,
    is_pet_candidate,
    pet_confidence,
    detected_pet_type
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(local_asset_id) DO UPDATE SET
    uri = CASE
      WHEN local_assets.uri LIKE 'ph://%'
        OR local_assets.uri LIKE 'file://%'
        OR local_assets.uri LIKE 'assets-library://%'
      THEN local_assets.uri
      ELSE excluded.uri
    END,
    created_at = local_assets.created_at,
    width = excluded.width,
    height = excluded.height,
    media_type = excluded.media_type,
    updated_at = CURRENT_TIMESTAMP
`;

async function upsertHydratedCloudAssets(
  database: SQLite.SQLiteDatabase,
  assets: NewLocalAsset[],
): Promise<void> {
  for (const asset of assets) {
    await database.runAsync(UPSERT_HYDRATED_CLOUD_ASSET_SQL, [
      asset.localAssetId,
      asset.uri,
      asset.createdAt,
      asset.width,
      asset.height,
      asset.mediaType,
      asset.processingStatus ?? 'processed',
      asset.processedAt ?? null,
      asset.isPetCandidate ? 1 : 0,
      asset.petConfidence ?? null,
      asset.detectedPetType ?? null,
    ]);
  }
}

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

async function upsertHydratedCloudEvent(
  database: SQLite.SQLiteDatabase,
  petId: string,
  remote: BootstrapTimelineEvent,
): Promise<void> {
  const assetIds = remote.media.map((item) => item.source_local_asset_id);
  const caption = resolveDisplayCaption(
    remote.caption,
    remote.caption_source,
    remote.source_local_event_id,
  );

  await database.runAsync(
    `
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
        selected_asset_ids,
        remote_event_id,
        server_sync_version,
        caption_source,
        user_edited_caption,
        user_edited_event_type,
        pending_ai,
        pending_cloud_sync
      )
      VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, 'processed', ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(local_event_id) DO UPDATE SET
        pet_id = excluded.pet_id,
        timestamp = local_events.timestamp,
        source = excluded.source,
        event_type = excluded.event_type,
        caption = excluded.caption,
        is_favorite = excluded.is_favorite,
        processing_state = 'processed',
        selected_asset_ids = excluded.selected_asset_ids,
        remote_event_id = excluded.remote_event_id,
        server_sync_version = excluded.server_sync_version,
        caption_source = excluded.caption_source,
        user_edited_caption = excluded.user_edited_caption,
        user_edited_event_type = excluded.user_edited_event_type,
        pending_ai = 0,
        pending_cloud_sync = 0,
        deleted_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      remote.source_local_event_id,
      petId,
      remote.timestamp,
      remote.source,
      remote.event_type,
      caption,
      remote.is_favorite ? 1 : 0,
      JSON.stringify(assetIds),
      remote.event_id,
      remote.sync_version,
      remote.caption_source,
      remote.user_edited_caption ? 1 : 0,
      remote.user_edited_event_type ? 1 : 0,
    ],
  );

  const assets: NewLocalAsset[] = remote.media.map((item) => ({
    localAssetId: item.source_local_asset_id,
    uri: item.thumbnail_url,
    createdAt: remote.timestamp,
    width: item.width,
    height: item.height,
    mediaType: 'photo' as const,
    processingStatus: 'processed' as const,
    processedAt: remote.updated_at,
    isPetCandidate: true,
    petConfidence: 1,
    detectedPetType: item.detected_pet_type,
  }));

  await upsertHydratedCloudAssets(database, assets);

  const scores: NewLocalMediaScore[] = remote.media.map((item) => ({
    localAssetId: item.source_local_asset_id,
    localEventId: remote.source_local_event_id,
    sharpness: HYDRATED_CLOUD_SCORE,
    brightness: HYDRATED_CLOUD_SCORE,
    subjectVisibility: HYDRATED_CLOUD_SCORE,
    uniqueness: HYDRATED_CLOUD_SCORE,
    overallScore: item.is_primary ? 1 : HYDRATED_CLOUD_SCORE,
    isPrimary: item.is_primary,
  }));

  await upsertLocalMediaScores(database, scores);
}

async function fetchBootstrapPage(cursor: string | null): Promise<
  | {
      status: 'ok';
      events: BootstrapTimelineEvent[];
      nextCursor: string | null;
    }
  | { status: 'error'; message: string }
> {
  const result = await invokeTailoApi('bootstrap-timeline', {
    ...(cursor ? { cursor } : {}),
    limit: 20,
  });

  if ('error' in result) {
    return { status: 'error', message: result.error };
  }

  if (!result.ok) {
    return {
      status: 'error',
      message: readApiErrorMessage(
        result.payload,
        `Bootstrap failed (${result.status}).`,
      ),
    };
  }

  if (!isBootstrapTimelineResponse(result.payload)) {
    return {
      status: 'error',
      message: 'Invalid bootstrap response from server.',
    };
  }

  return {
    status: 'ok',
    events: result.payload.events,
    nextCursor: result.payload.next_cursor,
  };
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

  for (let page = 0; page < 50; page += 1) {
    const pageResult = await fetchBootstrapPage(cursor);

    if (pageResult.status === 'error') {
      return pageResult;
    }

    for (const event of pageResult.events) {
      await upsertHydratedCloudEvent(database, petId, event);
      totalEvents += 1;

      if (
        !latestCursorEvent ||
        event.updated_at > latestCursorEvent.updated_at
      ) {
        latestCursorEvent = event;
      }
    }

    if (!pageResult.nextCursor) {
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

  logTailo('Sync', 'Cloud timeline hydrated on device', {
    eventCount: totalEvents,
  });

  return { status: 'hydrated', eventCount: totalEvents };
}
