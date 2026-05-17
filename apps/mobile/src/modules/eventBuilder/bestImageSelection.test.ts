import type * as SQLite from 'expo-sqlite';

import { selectBestEventImages } from './bestImageSelection';

describe('selectBestEventImages', () => {
  it('scores candidate assets, stores scores, and updates event selection', async () => {
    const getAllAsync = jest
      .fn()
      .mockResolvedValueOnce([
        {
          localEventId: 'event-1',
          timestamp: '2026-05-17T03:30:00.000Z',
          source: 'camera_roll',
          candidateStatus: 'pending',
          selectedAssetIds: JSON.stringify(['asset-1', 'asset-2']),
        },
      ])
      .mockResolvedValueOnce([
        {
          localAssetId: 'asset-1',
          createdAt: '2026-05-17T03:30:00.000Z',
          width: 1920,
          height: 1080,
          petConfidence: 0.8,
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

    const result = await selectBestEventImages({
      database: db,
      onProgress,
    });

    expect(result.eventCount).toBe(1);
    expect(result.scoredAssetCount).toBe(2);
    expect(result.selectedAssetCount).toBe(2);
    expect(runAsync).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenCalledWith(result);
  });
});
