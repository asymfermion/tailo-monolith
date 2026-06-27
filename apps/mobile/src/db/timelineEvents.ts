import type * as SQLite from 'expo-sqlite';
import { resolveDisplayCaption } from '@tailo/ai';
import type { CaptionSource } from '@/db/localEvents';
import type { LocalPetType } from '@/modules/pets';
import type { TimelineEvent, TimelineEventMedia } from '@/types';

type TimelineEventRow = {
  localEventId: string;
  timestamp: string;
  source: TimelineEvent['source'];
  eventType: TimelineEvent['eventType'];
  caption: string | null;
  captionSource: CaptionSource | null;
  isFavorite: number;
  selectedAssetIds: string;
};

type TimelineEventMediaRow = {
  localAssetId: string;
  uri: string;
  width: number;
  height: number;
  isPrimary: number;
  detectedPetType: TimelineEventMedia['detectedPetType'];
  petConfidence: number | null;
  overallScore: number;
  isPetCandidate: number;
  detectionDebugLabel: string | null;
  detectedBreed: string | null;
};

export type TimelineEventsQuery = {
  favoritesOnly?: boolean;
  /** When set (onboarding), only media matching this pet type is shown. */
  profilePetType?: LocalPetType | null;
};

export async function getTimelineEvents(
  db: SQLite.SQLiteDatabase,
  query: TimelineEventsQuery = {},
): Promise<TimelineEvent[]> {
  const profilePetType = query.profilePetType ?? null;
  const rows = await db.getAllAsync<TimelineEventRow>(
    `
    SELECT
      local_event_id AS localEventId,
      timestamp,
      source,
      event_type AS eventType,
      caption,
      caption_source AS captionSource,
      is_favorite AS isFavorite,
      selected_asset_ids AS selectedAssetIds
    FROM local_events
    WHERE processing_state = 'processed'
      AND deleted_at IS NULL
      ${query.favoritesOnly ? 'AND is_favorite = 1' : ''}
      ${
        profilePetType
          ? `AND EXISTS (
        SELECT 1
        FROM local_media_scores AS scores
        INNER JOIN local_assets AS assets
          ON assets.local_asset_id = scores.local_asset_id
        WHERE scores.local_event_id = local_events.local_event_id
          AND scores.is_primary = 1
          AND assets.detected_pet_type = ?
          AND assets.is_pet_candidate = 1
      )`
          : ''
      }
    ORDER BY timestamp DESC
  `,
    profilePetType ? [profilePetType] : [],
  );

  const events: TimelineEvent[] = [];

  for (const row of rows) {
    const event = await buildTimelineEvent(db, row, query.profilePetType);

    if (event) {
      events.push(event);
    }
  }

  return events;
}

export async function getTimelineEventById(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
  query: Pick<TimelineEventsQuery, 'profilePetType'> = {},
): Promise<TimelineEvent | null> {
  const row = await db.getFirstAsync<TimelineEventRow>(
    `
    SELECT
      local_event_id AS localEventId,
      timestamp,
      source,
      event_type AS eventType,
      caption,
      caption_source AS captionSource,
      is_favorite AS isFavorite,
      selected_asset_ids AS selectedAssetIds
    FROM local_events
    WHERE local_event_id = ?
      AND processing_state = 'processed'
      AND deleted_at IS NULL
    LIMIT 1
  `,
    [localEventId],
  );

  if (!row) {
    return null;
  }

  return buildTimelineEvent(db, row, query.profilePetType);
}

async function buildTimelineEvent(
  db: SQLite.SQLiteDatabase,
  row: TimelineEventRow,
  profilePetType?: LocalPetType | null,
): Promise<TimelineEvent | null> {
  const selectedAssetIds = parseSelectedAssetIds(row.selectedAssetIds);
  const media = await getTimelineEventMedia(
    db,
    row.localEventId,
    selectedAssetIds,
    profilePetType,
  );

  if (media.length === 0) {
    return null;
  }

  const displayCaption = resolveDisplayCaption(
    row.caption,
    row.captionSource,
    row.localEventId,
  );

  return {
    localEventId: row.localEventId,
    timestamp: row.timestamp,
    eventType: row.eventType,
    source: row.source,
    caption: displayCaption,
    captionSource: row.captionSource,
    isFavorite: Boolean(row.isFavorite),
    media,
  };
}

async function getTimelineEventMedia(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
  selectedAssetIds: string[],
  profilePetType?: LocalPetType | null,
): Promise<TimelineEventMedia[]> {
  if (selectedAssetIds.length === 0) {
    return [];
  }

  const placeholders = selectedAssetIds.map(() => '?').join(', ');
  const petTypeClause = profilePetType
    ? 'AND assets.is_pet_candidate = 1 AND assets.detected_pet_type = ?'
    : '';
  const queryParams = profilePetType
    ? [localEventId, ...selectedAssetIds, profilePetType]
    : [localEventId, ...selectedAssetIds];

  const rows = await db.getAllAsync<TimelineEventMediaRow>(
    `
      SELECT
        assets.local_asset_id AS localAssetId,
        assets.uri,
        assets.width,
        assets.height,
        scores.is_primary = 1 AS isPrimary,
        assets.detected_pet_type AS detectedPetType,
        assets.pet_confidence AS petConfidence,
        scores.overall_score AS overallScore,
        assets.is_pet_candidate AS isPetCandidate,
        assets.detection_debug_label AS detectionDebugLabel,
        assets.detected_breed AS detectedBreed
      FROM local_assets AS assets
      INNER JOIN local_media_scores AS scores
        ON scores.local_asset_id = assets.local_asset_id
      WHERE scores.local_event_id = ?
        AND assets.local_asset_id IN (${placeholders})
        ${petTypeClause}
      ORDER BY scores.is_primary DESC, scores.overall_score DESC
    `,
    queryParams,
  );
  const orderByAssetId = new Map(
    selectedAssetIds.map((localAssetId, index) => [localAssetId, index]),
  );

  return rows
    .sort(
      (left, right) =>
        (orderByAssetId.get(left.localAssetId) ?? Number.MAX_SAFE_INTEGER) -
        (orderByAssetId.get(right.localAssetId) ?? Number.MAX_SAFE_INTEGER),
    )
    .map((row) => ({
      localAssetId: row.localAssetId,
      uri: row.uri,
      width: row.width,
      height: row.height,
      isPrimary: Boolean(row.isPrimary),
      detectedPetType: row.detectedPetType,
      petConfidence: row.petConfidence,
      overallScore: row.overallScore,
      isPetCandidate: Boolean(row.isPetCandidate),
      detectionDebugLabel: row.detectionDebugLabel,
      detectedBreed: row.detectedBreed,
    }));
}

function parseSelectedAssetIds(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}
