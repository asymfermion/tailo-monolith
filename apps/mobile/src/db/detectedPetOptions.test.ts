import type * as SQLite from 'expo-sqlite';

import { coerceBreedLabel, getDetectedPetOptions } from './detectedPetOptions';

describe('coerceBreedLabel', () => {
  it('passes through real breed labels', () => {
    expect(coerceBreedLabel('golden_retriever')).toBe('golden_retriever');
    expect(coerceBreedLabel('Persian_cat')).toBe('Persian_cat');
    expect(coerceBreedLabel('Siamese')).toBe('Siamese');
    expect(coerceBreedLabel('poodle')).toBe('poodle');
    expect(coerceBreedLabel(null)).toBeNull();
  });

  it('nulls out non-animal scene labels (top-2 false positives)', () => {
    // scene categories that VNClassifyImageRequest returns for background-heavy photos
    expect(coerceBreedLabel('decorative_plant')).toBeNull();
    expect(coerceBreedLabel('tool')).toBeNull();
    expect(coerceBreedLabel('conveyance')).toBeNull();
    expect(coerceBreedLabel('indoor')).toBeNull();
    expect(coerceBreedLabel('outdoor')).toBeNull();
    expect(coerceBreedLabel('furniture')).toBeNull();
    expect(coerceBreedLabel('hardwood_floor')).toBeNull();
    expect(coerceBreedLabel('wooden_surface')).toBeNull();
    expect(coerceBreedLabel('building_structure')).toBeNull();
    expect(coerceBreedLabel('kitchen_appliance')).toBeNull();
    expect(coerceBreedLabel('body_of_water')).toBeNull();
    expect(coerceBreedLabel('mountain_range')).toBeNull();
    expect(coerceBreedLabel('potted_plant')).toBeNull();
    expect(coerceBreedLabel('inanimate_object')).toBeNull();
    expect(coerceBreedLabel('living_room')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(coerceBreedLabel('Indoor')).toBeNull();
    expect(coerceBreedLabel('PLANT')).toBeNull();
    expect(coerceBreedLabel('Golden_Retriever')).toBe('Golden_Retriever');
  });
});

describe('getDetectedPetOptions', () => {
  it('coerces non-animal breed labels to null in returned results', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([
      {
        type: 'cat',
        breed: 'decorative_plant',
        momentCount: 3,
        previewUri: 'ph://cat1',
        previewLocalAssetId: 'asset-cat1',
      },
      {
        type: 'dog',
        breed: 'golden_retriever',
        momentCount: 8,
        previewUri: 'ph://dog1',
        previewLocalAssetId: 'asset-dog1',
      },
    ]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    const result = await getDetectedPetOptions(db);

    expect(result[0]).toEqual({
      type: 'dog',
      breed: 'golden_retriever',
      momentCount: 8,
      previewUri: 'ph://dog1',
      previewLocalAssetId: 'asset-dog1',
    });
    expect(result[1]).toEqual({
      type: 'cat',
      breed: null, // decorative_plant coerced to null
      momentCount: 3,
      previewUri: 'ph://cat1',
      previewLocalAssetId: 'asset-cat1',
    });
  });

  it('merges rows that coerce to the same (type, null) breed key', async () => {
    // 'material' and 'structure' both coerce to null → should produce one dog:null row
    const getAllAsync = jest.fn().mockResolvedValue([
      {
        type: 'dog',
        breed: 'material',
        momentCount: 5,
        previewUri: 'ph://dog1',
        previewLocalAssetId: 'asset-1',
      },
      {
        type: 'dog',
        breed: 'structure',
        momentCount: 3,
        previewUri: 'ph://dog2',
        previewLocalAssetId: 'asset-2',
      },
      {
        type: 'dog',
        breed: 'hound',
        momentCount: 8,
        previewUri: 'ph://dog3',
        previewLocalAssetId: 'asset-3',
      },
    ]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    const result = await getDetectedPetOptions(db);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      type: 'dog',
      breed: 'hound',
      momentCount: 8,
      previewUri: 'ph://dog3',
      previewLocalAssetId: 'asset-3',
    });
    expect(result[1]).toEqual({
      type: 'dog',
      breed: null,
      momentCount: 8, // 5 + 3 merged
      previewUri: 'ph://dog1', // first preview kept
      previewLocalAssetId: 'asset-1',
    });
  });

  it('returns breed-grouped pet options with preview metadata', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([
      {
        type: 'dog',
        breed: 'Golden Retriever',
        momentCount: 12,
        previewUri: 'ph://dog1',
        previewLocalAssetId: 'asset-dog1',
      },
      {
        type: 'dog',
        breed: 'Labrador',
        momentCount: 7,
        previewUri: 'ph://dog2',
        previewLocalAssetId: 'asset-dog2',
      },
      {
        type: 'cat',
        breed: null,
        momentCount: 4,
        previewUri: 'ph://cat',
        previewLocalAssetId: 'asset-cat',
      },
    ]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(getDetectedPetOptions(db)).resolves.toEqual([
      {
        type: 'dog',
        breed: 'Golden Retriever',
        momentCount: 12,
        previewUri: 'ph://dog1',
        previewLocalAssetId: 'asset-dog1',
      },
      {
        type: 'dog',
        breed: 'Labrador',
        momentCount: 7,
        previewUri: 'ph://dog2',
        previewLocalAssetId: 'asset-dog2',
      },
      {
        type: 'cat',
        breed: null,
        momentCount: 4,
        previewUri: 'ph://cat',
        previewLocalAssetId: 'asset-cat',
      },
    ]);
  });

  it('caps results at 4', async () => {
    const rows = Array.from({ length: 4 }, (_, i) => ({
      type: 'dog' as const,
      breed: `Breed ${i}`,
      momentCount: 10 - i,
      previewUri: null,
      previewLocalAssetId: null,
    }));
    const getAllAsync = jest.fn().mockResolvedValue(rows);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    const result = await getDetectedPetOptions(db);
    expect(result).toHaveLength(4);
  });
});
