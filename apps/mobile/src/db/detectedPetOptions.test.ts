import type * as SQLite from 'expo-sqlite';

import { getDetectedPetOptions } from './detectedPetOptions';

describe('getDetectedPetOptions', () => {
  it('returns grouped pet types with preview metadata', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([
      {
        type: 'dog',
        momentCount: 12,
        previewUri: 'ph://dog',
        previewLocalAssetId: 'asset-dog',
      },
      {
        type: 'cat',
        momentCount: 4,
        previewUri: 'ph://cat',
        previewLocalAssetId: 'asset-cat',
      },
    ]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(getDetectedPetOptions(db)).resolves.toEqual([
      {
        type: 'dog',
        momentCount: 12,
        previewUri: 'ph://dog',
        previewLocalAssetId: 'asset-dog',
      },
      {
        type: 'cat',
        momentCount: 4,
        previewUri: 'ph://cat',
        previewLocalAssetId: 'asset-cat',
      },
    ]);
  });
});
