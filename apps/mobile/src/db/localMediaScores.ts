import type * as SQLite from 'expo-sqlite';

import type { NewLocalMediaScore } from '@/types';

const UPSERT_LOCAL_MEDIA_SCORE_SQL = `
  INSERT INTO local_media_scores (
    local_asset_id,
    local_event_id,
    sharpness,
    brightness,
    subject_visibility,
    uniqueness,
    overall_score,
    is_primary
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(local_asset_id, local_event_id) DO UPDATE SET
    sharpness = excluded.sharpness,
    brightness = excluded.brightness,
    subject_visibility = excluded.subject_visibility,
    uniqueness = excluded.uniqueness,
    overall_score = excluded.overall_score,
    is_primary = excluded.is_primary,
    scored_at = CURRENT_TIMESTAMP
`;

export type LocalMediaScoreForEvent = {
  localAssetId: string;
  isPrimary: number;
  detectedPetType: 'dog' | 'cat' | null;
};

export async function getLocalMediaScoresForEvent(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
): Promise<LocalMediaScoreForEvent[]> {
  return db.getAllAsync<LocalMediaScoreForEvent>(
    `
      SELECT
        scores.local_asset_id AS localAssetId,
        scores.is_primary AS isPrimary,
        assets.detected_pet_type AS detectedPetType
      FROM local_media_scores AS scores
      INNER JOIN local_assets AS assets
        ON assets.local_asset_id = scores.local_asset_id
      WHERE scores.local_event_id = ?
    `,
    [localEventId],
  );
}

export async function setPrimaryAssetForEvent(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
  primaryAssetId: string,
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
      WHERE local_event_id = ?
        AND local_asset_id = ?
    `,
    [localEventId, primaryAssetId],
  );
}

export async function upsertLocalMediaScores(
  db: SQLite.SQLiteDatabase,
  scores: NewLocalMediaScore[],
): Promise<number> {
  for (const score of scores) {
    await db.runAsync(UPSERT_LOCAL_MEDIA_SCORE_SQL, [
      score.localAssetId,
      score.localEventId,
      score.sharpness,
      score.brightness,
      score.subjectVisibility,
      score.uniqueness,
      score.overallScore,
      score.isPrimary ? 1 : 0,
    ]);
  }

  return scores.length;
}
