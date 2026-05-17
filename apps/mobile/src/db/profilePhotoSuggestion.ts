import type * as SQLite from 'expo-sqlite';

export type ProfilePhotoSuggestion = {
  localAssetId: string;
  uri: string;
  width: number;
  height: number;
  overallScore: number;
};

export async function getProfilePhotoSuggestion(
  db: SQLite.SQLiteDatabase,
): Promise<ProfilePhotoSuggestion | null> {
  return db.getFirstAsync<ProfilePhotoSuggestion>(`
    SELECT
      assets.local_asset_id AS localAssetId,
      assets.uri,
      assets.width,
      assets.height,
      scores.overall_score AS overallScore
    FROM local_media_scores AS scores
    INNER JOIN local_assets AS assets
      ON assets.local_asset_id = scores.local_asset_id
    ORDER BY scores.is_primary DESC, scores.overall_score DESC
    LIMIT 1
  `);
}
