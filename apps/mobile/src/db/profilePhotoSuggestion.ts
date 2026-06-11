import type * as SQLite from 'expo-sqlite';

import type { LocalPetType } from '@/modules/pets';

export type ProfilePhotoSuggestion = {
  localAssetId: string;
  uri: string;
  width: number;
  height: number;
  overallScore: number;
};

const PROFILE_PHOTO_SUGGESTION_LIMIT = 3;
const MOMENT_PHOTO_CHOICE_LIMIT = 24;

export async function getProfilePhotoSuggestions(
  db: SQLite.SQLiteDatabase,
  profilePetType?: LocalPetType | null,
  limit = PROFILE_PHOTO_SUGGESTION_LIMIT,
): Promise<ProfilePhotoSuggestion[]> {
  const petTypeClause = profilePetType
    ? 'AND assets.detected_pet_type = ?'
    : '';
  const params = profilePetType ? [profilePetType, limit] : [limit];

  return db.getAllAsync<ProfilePhotoSuggestion>(
    `
    SELECT
      assets.local_asset_id AS localAssetId,
      assets.uri,
      assets.width,
      assets.height,
      scores.overall_score AS overallScore
    FROM local_media_scores AS scores
    INNER JOIN local_assets AS assets
      ON assets.local_asset_id = scores.local_asset_id
    WHERE assets.is_pet_candidate = 1
      ${petTypeClause}
    ORDER BY scores.is_primary DESC, scores.overall_score DESC
    LIMIT ?
  `,
    params,
  );
}

export async function getProfilePhotoSuggestion(
  db: SQLite.SQLiteDatabase,
  profilePetType?: LocalPetType | null,
): Promise<ProfilePhotoSuggestion | null> {
  const suggestions = await getProfilePhotoSuggestions(db, profilePetType, 1);
  return suggestions[0] ?? null;
}

export async function getMomentPhotoChoices(
  db: SQLite.SQLiteDatabase,
  profilePetType?: LocalPetType | null,
  limit = MOMENT_PHOTO_CHOICE_LIMIT,
): Promise<ProfilePhotoSuggestion[]> {
  const petTypeClause = profilePetType
    ? 'AND assets.detected_pet_type = ?'
    : '';
  const params = profilePetType ? [profilePetType, limit] : [limit];

  return db.getAllAsync<ProfilePhotoSuggestion>(
    `
    SELECT DISTINCT
      assets.local_asset_id AS localAssetId,
      assets.uri,
      assets.width,
      assets.height,
      scores.overall_score AS overallScore
    FROM local_events AS events
    INNER JOIN local_media_scores AS scores
      ON scores.local_event_id = events.local_event_id
    INNER JOIN local_assets AS assets
      ON assets.local_asset_id = scores.local_asset_id
    WHERE events.deleted_at IS NULL
      AND events.processing_state = 'processed'
      ${petTypeClause}
    ORDER BY events.timestamp DESC, scores.is_primary DESC, scores.overall_score DESC
    LIMIT ?
  `,
    params,
  );
}
