import type * as SQLite from 'expo-sqlite';

import { MIN_PET_CONFIDENCE } from '@/modules/eventBuilder/petDetector/constants';
import type { DetectionSource } from '@/modules/eventBuilder/petDetector/types';
import type { LocalPetType } from '@/modules/pets';
import type { DetectedPetType, NewLocalAsset } from '@/types';

export type LocalAssetDetectionInput = {
  localAssetId: string;
  uri: string;
  createdAt: string;
  width: number;
  height: number;
};

export type LocalAssetDetectionUpdate = {
  localAssetId: string;
  isPetCandidate: boolean;
  petConfidence: number;
  detectedPetType: DetectedPetType | null;
  detectionSource: DetectionSource;
  detectionDebugLabel: string | null;
  detectedBreed: string | null;
};

export type LocalPetCandidateAsset = {
  localAssetId: string;
  createdAt: string;
  width: number;
  height: number;
  petConfidence: number;
  detectedPetType: DetectedPetType | null;
};

export type LocalAssetScoringInput = LocalPetCandidateAsset;

const UPSERT_LOCAL_ASSET_SQL = `
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
    uri = excluded.uri,
    created_at = excluded.created_at,
    width = excluded.width,
    height = excluded.height,
    media_type = excluded.media_type,
    updated_at = CURRENT_TIMESTAMP
`;

const SELECT_UNPROCESSED_LOCAL_ASSETS_SQL = `
  SELECT
    local_asset_id AS localAssetId,
    uri,
    created_at AS createdAt,
    width,
    height
  FROM local_assets
  WHERE media_type = 'photo'
    AND processing_status = 'pending'
    AND user_dismissed_at IS NULL
  ORDER BY created_at DESC
  LIMIT ?
`;

const UPDATE_LOCAL_ASSET_DETECTION_SQL = `
  UPDATE local_assets
  SET
    processing_status = 'processed',
    processed_at = CURRENT_TIMESTAMP,
    is_pet_candidate = ?,
    pet_confidence = ?,
    detected_pet_type = ?,
    detection_source = ?,
    detection_debug_label = ?,
    detected_breed = ?,
    updated_at = CURRENT_TIMESTAMP
  WHERE local_asset_id = ?
`;

type PetCandidateCountRow = {
  count: number;
};

const SELECT_LOCAL_PET_CANDIDATES_BASE_SQL = `
  SELECT
    local_asset_id AS localAssetId,
    created_at AS createdAt,
    width,
    height,
    pet_confidence AS petConfidence,
    detected_pet_type AS detectedPetType
  FROM local_assets
  WHERE is_pet_candidate = 1
    AND pet_confidence IS NOT NULL
    AND pet_confidence >= ?
    AND user_dismissed_at IS NULL
`;

export async function upsertLocalAssets(
  db: SQLite.SQLiteDatabase,
  assets: NewLocalAsset[],
): Promise<number> {
  for (const asset of assets) {
    await db.runAsync(UPSERT_LOCAL_ASSET_SQL, [
      asset.localAssetId,
      asset.uri,
      asset.createdAt,
      asset.width,
      asset.height,
      asset.mediaType,
      asset.processingStatus ?? 'pending',
      asset.processedAt ?? null,
      asset.isPetCandidate ? 1 : 0,
      asset.petConfidence ?? null,
      asset.detectedPetType ?? null,
    ]);
  }

  return assets.length;
}

export async function getPendingLocalAssetsForDetection(
  db: SQLite.SQLiteDatabase,
  limit: number,
): Promise<LocalAssetDetectionInput[]> {
  return db.getAllAsync<LocalAssetDetectionInput>(
    SELECT_UNPROCESSED_LOCAL_ASSETS_SQL,
    [limit],
  );
}

export async function countPendingLocalAssetsForDetection(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  const row = await db.getFirstAsync<PetCandidateCountRow>(`
    SELECT COUNT(*) AS count
    FROM local_assets
    WHERE media_type = 'photo'
      AND processing_status = 'pending'
      AND user_dismissed_at IS NULL
  `);

  return row?.count ?? 0;
}

export async function updateLocalAssetDetectionResults(
  db: SQLite.SQLiteDatabase,
  updates: LocalAssetDetectionUpdate[],
): Promise<number> {
  for (const update of updates) {
    await db.runAsync(UPDATE_LOCAL_ASSET_DETECTION_SQL, [
      update.isPetCandidate ? 1 : 0,
      update.petConfidence,
      update.detectedPetType,
      update.detectionSource,
      update.detectionDebugLabel,
      update.detectedBreed,
      update.localAssetId,
    ]);
  }

  return updates.length;
}

const RESET_LOCAL_ASSETS_FOR_REDETECTION_SQL = `
  UPDATE local_assets
  SET
    processing_status = 'pending',
    processed_at = NULL,
    is_pet_candidate = 0,
    pet_confidence = NULL,
    detected_pet_type = NULL,
    detection_source = NULL,
    detection_debug_label = NULL,
    detected_breed = NULL,
    updated_at = CURRENT_TIMESTAMP
  WHERE media_type = 'photo'
    AND user_dismissed_at IS NULL
`;

export async function dismissLocalAssetsForMoment(
  db: SQLite.SQLiteDatabase,
  localAssetIds: string[],
  dismissedAt: string,
): Promise<number> {
  if (localAssetIds.length === 0) {
    return 0;
  }

  const placeholders = localAssetIds.map(() => '?').join(', ');
  const result = await db.runAsync(
    `
      UPDATE local_assets
      SET
        user_dismissed_at = ?,
        is_pet_candidate = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE local_asset_id IN (${placeholders})
        AND user_dismissed_at IS NULL
    `,
    [dismissedAt, ...localAssetIds],
  );

  return result.changes;
}

export async function resetLocalAssetsForRedetection(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  const result = await db.runAsync(RESET_LOCAL_ASSETS_FOR_REDETECTION_SQL);
  return result.changes;
}

/** Re-apply is_pet_candidate after the user picks dog or cat (scan may have run earlier). */
export async function reapplyPetCandidateFlagsForProfile(
  db: SQLite.SQLiteDatabase,
  profilePetType: LocalPetType,
): Promise<number> {
  const result = await db.runAsync(
    `
      UPDATE local_assets
      SET
        is_pet_candidate = CASE
          WHEN detected_pet_type = ?
            AND pet_confidence IS NOT NULL
            AND pet_confidence >= ?
          THEN 1
          ELSE 0
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE media_type = 'photo'
        AND processing_status = 'processed'
    `,
    [profilePetType, MIN_PET_CONFIDENCE],
  );

  return result.changes;
}

export async function countLocalPetCandidates(
  db: SQLite.SQLiteDatabase,
  profilePetType?: LocalPetType | null,
): Promise<number> {
  const petTypeFilter = buildPetTypeFilter(profilePetType);
  const row = await db.getFirstAsync<PetCandidateCountRow>(
    `
      SELECT COUNT(*) AS count
      FROM local_assets
      WHERE is_pet_candidate = 1
        AND pet_confidence IS NOT NULL
        AND pet_confidence >= ?
        ${petTypeFilter.clause}
    `,
    [MIN_PET_CONFIDENCE, ...petTypeFilter.params],
  );

  return row?.count ?? 0;
}

export async function getLocalPetCandidateAssets(
  db: SQLite.SQLiteDatabase,
  profilePetType?: LocalPetType | null,
): Promise<LocalPetCandidateAsset[]> {
  const query = buildLocalPetCandidatesQuery(profilePetType);
  return db.getAllAsync<LocalPetCandidateAsset>(query.sql, query.params);
}

function buildLocalPetCandidatesQuery(profilePetType?: LocalPetType | null): {
  sql: string;
  params: (string | number)[];
} {
  const petTypeFilter = buildPetTypeFilter(profilePetType);

  return {
    sql: `${SELECT_LOCAL_PET_CANDIDATES_BASE_SQL}${petTypeFilter.clause}
  ORDER BY created_at DESC`,
    params: [MIN_PET_CONFIDENCE, ...petTypeFilter.params],
  };
}

function buildPetTypeFilter(profilePetType?: LocalPetType | null): {
  clause: string;
  params: string[];
} {
  if (!profilePetType) {
    return { clause: '', params: [] };
  }

  return {
    clause: '    AND detected_pet_type = ?',
    params: [profilePetType],
  };
}

export async function countLocalAssets(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  const row = await db.getFirstAsync<PetCandidateCountRow>(`
    SELECT COUNT(*) AS count
    FROM local_assets
    WHERE media_type = 'photo'
  `);

  return row?.count ?? 0;
}

export async function countLocalAssetsCreatedAfter(
  db: SQLite.SQLiteDatabase,
  createdAfterMs: number,
): Promise<number> {
  const createdAfterIso = new Date(createdAfterMs).toISOString();
  const row = await db.getFirstAsync<PetCandidateCountRow>(
    `
      SELECT COUNT(*) AS count
      FROM local_assets
      WHERE media_type = 'photo'
        AND created_at >= ?
    `,
    [createdAfterIso],
  );

  return row?.count ?? 0;
}

export type LocalAssetUploadSource = {
  localAssetId: string;
  uri: string;
  width: number;
  height: number;
};

export async function getLocalAssetUploadSourcesByIds(
  db: SQLite.SQLiteDatabase,
  localAssetIds: string[],
): Promise<LocalAssetUploadSource[]> {
  if (localAssetIds.length === 0) {
    return [];
  }

  const placeholders = localAssetIds.map(() => '?').join(', ');

  return db.getAllAsync<LocalAssetUploadSource>(
    `
      SELECT
        local_asset_id AS localAssetId,
        uri,
        width,
        height
      FROM local_assets
      WHERE local_asset_id IN (${placeholders})
    `,
    localAssetIds,
  );
}

export async function getLocalAssetDetectionInputsForPromotedEvents(
  db: SQLite.SQLiteDatabase,
): Promise<LocalAssetDetectionInput[]> {
  return db.getAllAsync<LocalAssetDetectionInput>(`
    SELECT DISTINCT
      assets.local_asset_id AS localAssetId,
      assets.uri,
      assets.created_at AS createdAt,
      assets.width,
      assets.height
    FROM local_media_scores AS scores
    INNER JOIN local_assets AS assets
      ON assets.local_asset_id = scores.local_asset_id
    INNER JOIN local_events AS events
      ON events.local_event_id = scores.local_event_id
    WHERE events.processing_state = 'processed'
      AND events.deleted_at IS NULL
      AND assets.media_type = 'photo'
      AND assets.user_dismissed_at IS NULL
  `);
}

export async function getLocalAssetsByIds(
  db: SQLite.SQLiteDatabase,
  localAssetIds: string[],
): Promise<LocalAssetScoringInput[]> {
  if (localAssetIds.length === 0) {
    return [];
  }

  const placeholders = localAssetIds.map(() => '?').join(', ');

  return db.getAllAsync<LocalAssetScoringInput>(
    `
      SELECT
        local_asset_id AS localAssetId,
        created_at AS createdAt,
        width,
        height,
        COALESCE(pet_confidence, 0) AS petConfidence,
        detected_pet_type AS detectedPetType
      FROM local_assets
      WHERE local_asset_id IN (${placeholders})
    `,
    localAssetIds,
  );
}
