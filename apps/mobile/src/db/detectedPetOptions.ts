import type * as SQLite from 'expo-sqlite';

import { MIN_PET_CONFIDENCE } from '@/modules/eventBuilder/petDetector/constants';
import type { LocalPetType } from '@/modules/pets';

export type DetectedPetOption = {
  type: LocalPetType;
  momentCount: number;
  previewUri: string | null;
  previewLocalAssetId: string | null;
};

type DetectedPetOptionRow = {
  type: LocalPetType;
  momentCount: number;
  previewUri: string | null;
  previewLocalAssetId: string | null;
};

/**
 * Pet types found during the initial scan, for the post-scan "choose your pet" step.
 * Uses processed assets only (no profile filter).
 */
export async function getDetectedPetOptions(
  db: SQLite.SQLiteDatabase,
): Promise<DetectedPetOption[]> {
  const rows = await db.getAllAsync<DetectedPetOptionRow>(
    `
      SELECT
        assets.detected_pet_type AS type,
        COUNT(*) AS momentCount,
        (
          SELECT preview.uri
          FROM local_assets AS preview
          WHERE preview.detected_pet_type = assets.detected_pet_type
            AND preview.is_pet_candidate = 1
            AND preview.pet_confidence IS NOT NULL
            AND preview.pet_confidence >= ?
          ORDER BY preview.pet_confidence DESC, preview.created_at DESC
          LIMIT 1
        ) AS previewUri,
        (
          SELECT preview.local_asset_id
          FROM local_assets AS preview
          WHERE preview.detected_pet_type = assets.detected_pet_type
            AND preview.is_pet_candidate = 1
            AND preview.pet_confidence IS NOT NULL
            AND preview.pet_confidence >= ?
          ORDER BY preview.pet_confidence DESC, preview.created_at DESC
          LIMIT 1
        ) AS previewLocalAssetId
      FROM local_assets AS assets
      WHERE assets.is_pet_candidate = 1
        AND assets.detected_pet_type IN ('dog', 'cat')
        AND assets.pet_confidence IS NOT NULL
        AND assets.pet_confidence >= ?
      GROUP BY assets.detected_pet_type
      ORDER BY momentCount DESC
    `,
    [MIN_PET_CONFIDENCE, MIN_PET_CONFIDENCE, MIN_PET_CONFIDENCE],
  );

  return rows.map((row) => ({
    type: row.type,
    momentCount: row.momentCount,
    previewUri: row.previewUri,
    previewLocalAssetId: row.previewLocalAssetId,
  }));
}
