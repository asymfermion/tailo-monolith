import type * as SQLite from 'expo-sqlite';

import { clusterLocalPetEvents } from './eventClustering';

describe('clusterLocalPetEvents', () => {
  it('reads pet candidates and persists clustered event candidates', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([
      {
        localAssetId: 'asset-1',
        createdAt: '2026-05-17T03:30:00.000Z',
        width: 1920,
        height: 1080,
        petConfidence: 0.7,
        detectedPetType: 'dog',
      },
      {
        localAssetId: 'asset-2',
        createdAt: '2026-05-17T03:35:00.000Z',
        width: 1080,
        height: 1080,
        petConfidence: 0.9,
        detectedPetType: 'cat',
      },
    ]);
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    const db = {
      getAllAsync,
      runAsync,
    } as unknown as SQLite.SQLiteDatabase;
    const onProgress = jest.fn();

    const result = await clusterLocalPetEvents({
      database: db,
      onProgress,
    });

    expect(result).toEqual({
      petCandidateCount: 2,
      eventCandidateCount: 1,
      persistedCount: 1,
    });
    expect(runAsync).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(result);
  });
});
