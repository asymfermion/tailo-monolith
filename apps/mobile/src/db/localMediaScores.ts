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
