import type * as SQLite from 'expo-sqlite';

import { processPendingPetCandidates } from './petDetection';

describe('processPendingPetCandidates', () => {
  it('processes pending assets one at a time and reports progress', async () => {
    const getFirstAsync = jest
      .fn()
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValue({ count: 2 });
    const getAllAsync = jest
      .fn()
      .mockResolvedValueOnce([
        {
          localAssetId: 'asset-1',
          uri: 'ph://asset-1',
          createdAt: '2026-05-17T03:30:00.000Z',
          width: 1920,
          height: 1080,
        },
        {
          localAssetId: 'asset-2',
          uri: 'ph://asset-2',
          createdAt: '2026-05-17T03:31:00.000Z',
          width: 1080,
          height: 1080,
        },
      ])
      .mockResolvedValueOnce([]);
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    const db = {
      getAllAsync,
      getFirstAsync,
      runAsync,
    } as unknown as SQLite.SQLiteDatabase;
    const onProgress = jest.fn();
    const detect = jest.fn().mockResolvedValue({
      isPetCandidate: true,
      detectedPetType: 'dog',
      confidence: 0.8,
      detectionSource: 'native',
      detectionDebugLabel: 'dog',
    });

    const result = await processPendingPetCandidates({
      database: db,
      batchSize: 2,
      detectionTimeoutMs: 50,
      detector: { detect },
      onProgress,
    });

    expect(result.processedCount).toBe(2);
    expect(result.totalCount).toBe(2);
    expect(result.batchCount).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(detect).toHaveBeenCalledTimes(2);
    expect(runAsync).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        batchCount: 1,
        processedCount: 1,
        totalCount: 2,
      }),
    );
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({
        processedCount: 2,
        totalCount: 2,
        hasMore: false,
      }),
    );
  });

  it('falls back to the heuristic when detection exceeds the timeout', async () => {
    const getFirstAsync = jest
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValue({ count: 1 });
    const getAllAsync = jest.fn().mockResolvedValueOnce([
      {
        localAssetId: 'asset-1',
        uri: 'ph://asset-1',
        createdAt: '2026-05-17T03:30:00.000Z',
        width: 1920,
        height: 1080,
      },
    ]);
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    const db = {
      getAllAsync,
      getFirstAsync,
      runAsync,
    } as unknown as SQLite.SQLiteDatabase;

    const result = await processPendingPetCandidates({
      database: db,
      detectionTimeoutMs: 20,
      detector: {
        detect: () =>
          new Promise(() => {
            // Never resolves — simulates a hung native call.
          }),
      },
    });

    expect(result.processedCount).toBe(1);
    expect(runAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        0,
        expect.any(Number),
        null,
        'timeout_heuristic',
        'heuristic_skip',
        'asset-1',
      ]),
    );
  });
});
