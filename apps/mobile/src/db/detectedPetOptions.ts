import type * as SQLite from 'expo-sqlite';

import { MIN_PET_CONFIDENCE } from '@/modules/eventBuilder/petDetector/constants';
import type { LocalPetType } from '@/modules/pets';

export type DetectedPetOption = {
  type: LocalPetType;
  breed: string | null;
  momentCount: number;
  previewUri: string | null;
  previewLocalAssetId: string | null;
};

type DetectedPetOptionRow = {
  type: LocalPetType;
  breed: string | null;
  momentCount: number;
  previewUri: string | null;
  previewLocalAssetId: string | null;
};

// Non-animal scene substrings that VNClassifyImageRequest may return as the
// second-ranked label (top-2 approach) for background-heavy photos.
const NON_ANIMAL_SUBSTRINGS = [
  // biological taxonomy (too generic — not a breed)
  'mammal',
  'animal',
  'vertebrate',
  'carnivore',
  // scene / environment
  'plant',
  'flower',
  'tree',
  'grass',
  'frozen',
  'sky',
  'water',
  'mountain',
  'outdoor',
  'indoor',
  'room',
  'floor',
  'surface',
  // objects
  'food',
  'furniture',
  'tool',
  'equipment',
  'appliance',
  'instrument',
  'vehicle',
  'conveyance',
  'building',
  'structure',
  'textile',
  'material',
  'object',
  'clothing',
  'liquid',
  // people
  'person',
  'human',
];

export function coerceBreedLabel(raw: string | null): string | null {
  if (raw === null) return null;
  const lower = raw.toLowerCase();
  return NON_ANIMAL_SUBSTRINGS.some((s) => lower.includes(s)) ? null : raw;
}

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
        detected_pet_type AS type,
        detected_breed AS breed,
        COUNT(*) AS momentCount,
        (
          SELECT uri FROM local_assets AS preview
          WHERE preview.detected_pet_type = la.detected_pet_type
            AND (preview.detected_breed IS la.detected_breed)
            AND preview.is_pet_candidate = 1
          ORDER BY preview.pet_confidence DESC, preview.created_at DESC
          LIMIT 1
        ) AS previewUri,
        (
          SELECT local_asset_id FROM local_assets AS preview
          WHERE preview.detected_pet_type = la.detected_pet_type
            AND (preview.detected_breed IS la.detected_breed)
            AND preview.is_pet_candidate = 1
          ORDER BY preview.pet_confidence DESC, preview.created_at DESC
          LIMIT 1
        ) AS previewLocalAssetId
      FROM local_assets la
      WHERE is_pet_candidate = 1
        AND detected_pet_type IN ('dog', 'cat')
        AND pet_confidence IS NOT NULL
        AND pet_confidence >= ?
      GROUP BY detected_pet_type, detected_breed
      ORDER BY momentCount DESC
      LIMIT 4
    `,
    [MIN_PET_CONFIDENCE],
  );

  // Re-aggregate after coercion: multiple raw breed labels (e.g. 'material', 'structure')
  // may coerce to null, producing duplicate (type, null) rows that must be merged.
  const merged = new Map<string, DetectedPetOption>();
  for (const row of rows) {
    const breed = coerceBreedLabel(row.breed);
    const key = `${row.type}:${breed ?? ''}`;
    const existing = merged.get(key);
    if (existing) {
      existing.momentCount += row.momentCount;
      existing.previewUri ??= row.previewUri;
      existing.previewLocalAssetId ??= row.previewLocalAssetId;
    } else {
      merged.set(key, {
        type: row.type,
        breed,
        momentCount: row.momentCount,
        previewUri: row.previewUri,
        previewLocalAssetId: row.previewLocalAssetId,
      });
    }
  }

  return [...merged.values()]
    .sort(
      (a, b) =>
        b.momentCount - a.momentCount ||
        (a.breed === null ? 1 : 0) - (b.breed === null ? 1 : 0),
    )
    .slice(0, 4);
}
