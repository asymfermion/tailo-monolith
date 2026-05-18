import type * as SQLite from 'expo-sqlite';

import {
  getProfilePhotoSuggestion,
  getProfilePhotoSuggestions,
} from './profilePhotoSuggestion';

describe('getProfilePhotoSuggestions', () => {
  it('returns up to three scored profile photo options', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([
      {
        localAssetId: 'asset-1',
        uri: 'ph://asset-1',
        width: 1080,
        height: 1080,
        overallScore: 0.92,
      },
      {
        localAssetId: 'asset-2',
        uri: 'ph://asset-2',
        width: 1080,
        height: 1080,
        overallScore: 0.88,
      },
    ]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(getProfilePhotoSuggestions(db)).resolves.toHaveLength(2);
    expect(getAllAsync.mock.calls[0]?.[0]).toContain('LIMIT ?');
    expect(getAllAsync.mock.calls[0]?.[1]).toEqual([3]);
  });

  it('filters suggestions to the profile pet type', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    await getProfilePhotoSuggestions(db, 'dog');

    expect(getAllAsync.mock.calls[0]?.[0]).toContain('detected_pet_type = ?');
    expect(getAllAsync.mock.calls[0]?.[1]).toEqual(['dog', 3]);
  });
});

describe('getProfilePhotoSuggestion', () => {
  it('returns the top suggestion', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([
      {
        localAssetId: 'asset-1',
        uri: 'ph://asset-1',
        width: 1080,
        height: 1080,
        overallScore: 0.92,
      },
    ]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(getProfilePhotoSuggestion(db)).resolves.toEqual({
      localAssetId: 'asset-1',
      uri: 'ph://asset-1',
      width: 1080,
      height: 1080,
      overallScore: 0.92,
    });
    expect(getAllAsync.mock.calls[0]?.[1]).toEqual([1]);
  });
});
