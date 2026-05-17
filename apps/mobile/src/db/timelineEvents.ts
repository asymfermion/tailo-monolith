import type * as SQLite from 'expo-sqlite';

import type { TimelineEvent, TimelineEventMedia } from '@/types';

type TimelineEventRow = {
  localEventId: string;
  timestamp: string;
  source: TimelineEvent['source'];
  selectedAssetIds: string;
};

type TimelineEventMediaRow = TimelineEventMedia & {
  overallScore: number;
};

export async function getTimelineEvents(
  db: SQLite.SQLiteDatabase,
): Promise<TimelineEvent[]> {
  const rows = await db.getAllAsync<TimelineEventRow>(`
    SELECT
      local_event_id AS localEventId,
      timestamp,
      source,
      selected_asset_ids AS selectedAssetIds
    FROM local_event_candidates
    WHERE candidate_status IN ('scored', 'ready')
    ORDER BY timestamp DESC
  `);

  const events: TimelineEvent[] = [];

  for (const row of rows) {
    const selectedAssetIds = parseSelectedAssetIds(row.selectedAssetIds);
    const media = await getTimelineEventMedia(
      db,
      row.localEventId,
      selectedAssetIds,
    );

    if (media.length === 0) {
      continue;
    }

    events.push({
      localEventId: row.localEventId,
      timestamp: row.timestamp,
      eventType: 'unknown',
      source: row.source,
      caption: null,
      isFavorite: false,
      media,
    });
  }

  return events;
}

async function getTimelineEventMedia(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
  selectedAssetIds: string[],
): Promise<TimelineEventMedia[]> {
  if (selectedAssetIds.length === 0) {
    return [];
  }

  const placeholders = selectedAssetIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<TimelineEventMediaRow>(
    `
      SELECT
        assets.local_asset_id AS localAssetId,
        assets.uri,
        assets.width,
        assets.height,
        scores.is_primary = 1 AS isPrimary,
        scores.overall_score AS overallScore
      FROM local_assets AS assets
      INNER JOIN local_media_scores AS scores
        ON scores.local_asset_id = assets.local_asset_id
      WHERE scores.local_event_id = ?
        AND assets.local_asset_id IN (${placeholders})
      ORDER BY scores.is_primary DESC, scores.overall_score DESC
    `,
    [localEventId, ...selectedAssetIds],
  );
  const orderByAssetId = new Map(
    selectedAssetIds.map((localAssetId, index) => [localAssetId, index]),
  );

  return rows
    .sort((left, right) => {
      if (left.isPrimary !== right.isPrimary) {
        return left.isPrimary ? -1 : 1;
      }

      return (
        (orderByAssetId.get(left.localAssetId) ?? Number.MAX_SAFE_INTEGER) -
        (orderByAssetId.get(right.localAssetId) ?? Number.MAX_SAFE_INTEGER)
      );
    })
    .map(({ overallScore: _overallScore, ...media }) => ({
      ...media,
      isPrimary: Boolean(media.isPrimary),
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
