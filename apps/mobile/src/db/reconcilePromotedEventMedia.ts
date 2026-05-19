import type * as SQLite from 'expo-sqlite';

import type { LocalPetType } from '@/modules/pets';

export type PromotedLocalEventRow = {
  localEventId: string;
  selectedAssetIds: string;
};

export type ReconcilePromotedEventMediaResult = {
  removedScoreCount: number;
  updatedEventCount: number;
  removedEventCount: number;
};

export async function listPromotedLocalEvents(
  db: SQLite.SQLiteDatabase,
): Promise<PromotedLocalEventRow[]> {
  return db.getAllAsync<PromotedLocalEventRow>(`
    SELECT
      local_event_id AS localEventId,
      selected_asset_ids AS selectedAssetIds
    FROM local_events
    WHERE processing_state = 'processed'
  `);
}

export async function updateLocalEventSelectedAssetIds(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
  selectedAssetIds: string[],
): Promise<void> {
  await db.runAsync(
    `
      UPDATE local_events
      SET
        selected_asset_ids = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE local_event_id = ?
    `,
    [JSON.stringify(selectedAssetIds), localEventId],
  );
}

export async function deleteLocalMediaScoresForNonProfileAssets(
  db: SQLite.SQLiteDatabase,
  profilePetType: LocalPetType,
): Promise<number> {
  const result = await db.runAsync(
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

  return result.changes;
}

export async function reassignPrimaryMediaForEvent(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
  profilePetType: LocalPetType,
): Promise<void> {
  await db.runAsync(
    `
      UPDATE local_media_scores
      SET is_primary = 0
      WHERE local_event_id = ?
    `,
    [localEventId],
  );

  await db.runAsync(
    `
      UPDATE local_media_scores
      SET is_primary = 1
      WHERE local_asset_id = (
        SELECT scores.local_asset_id
        FROM local_media_scores AS scores
        INNER JOIN local_assets AS assets
          ON assets.local_asset_id = scores.local_asset_id
        WHERE scores.local_event_id = ?
          AND assets.is_pet_candidate = 1
          AND assets.detected_pet_type = ?
        ORDER BY scores.overall_score DESC, scores.local_asset_id ASC
        LIMIT 1
      )
      AND local_event_id = ?
    `,
    [localEventId, profilePetType, localEventId],
  );
}

export async function reconcilePromotedEventMediaForProfile(
  db: SQLite.SQLiteDatabase,
  profilePetType: LocalPetType,
): Promise<ReconcilePromotedEventMediaResult> {
  const removedScoreCount = await deleteLocalMediaScoresForNonProfileAssets(
    db,
    profilePetType,
  );

  const events = await listPromotedLocalEvents(db);
  let updatedEventCount = 0;

  for (const event of events) {
    const selectedAssetIds = parseSelectedAssetIds(event.selectedAssetIds);
    const remainingAssetIds = await getRemainingScoreAssetIdsForEvent(
      db,
      event.localEventId,
      selectedAssetIds,
    );

    if (
      remainingAssetIds.length !== selectedAssetIds.length ||
      remainingAssetIds.some((id, index) => id !== selectedAssetIds[index])
    ) {
      await updateLocalEventSelectedAssetIds(
        db,
        event.localEventId,
        remainingAssetIds,
      );
      updatedEventCount += 1;
    }

    if (remainingAssetIds.length > 0) {
      await reassignPrimaryMediaForEvent(
        db,
        event.localEventId,
        profilePetType,
      );
    }
  }

  const eventResult = await db.runAsync(
    `
      DELETE FROM local_events
      WHERE processing_state = 'processed'
        AND local_event_id NOT IN (
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
    removedScoreCount,
    updatedEventCount,
    removedEventCount: eventResult.changes,
  };
}

async function getRemainingScoreAssetIdsForEvent(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
  selectedAssetIds: string[],
): Promise<string[]> {
  if (selectedAssetIds.length === 0) {
    return [];
  }

  const placeholders = selectedAssetIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<{ localAssetId: string }>(
    `
      SELECT scores.local_asset_id AS localAssetId
      FROM local_media_scores AS scores
      WHERE scores.local_event_id = ?
        AND scores.local_asset_id IN (${placeholders})
      ORDER BY scores.is_primary DESC, scores.overall_score DESC
    `,
    [localEventId, ...selectedAssetIds],
  );

  return rows.map((row) => row.localAssetId);
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
