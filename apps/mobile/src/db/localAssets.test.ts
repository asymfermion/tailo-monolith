import type * as SQLite from 'expo-sqlite';

import {
  countLocalPetCandidates,
  countPendingLocalAssetsForDetection,
  getLocalPetCandidateAssets,
  getLocalAssetsByIds,
  getPendingLocalAssetsForDetection,
  resetLocalAssetsForRedetection,
  updateLocalAssetDetectionResults,
  upsertLocalAssets,
} from './localAssets';

describe('upsertLocalAssets', () => {
  it('persists each scanned asset with insert defaults', async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    const db = { runAsync } as unknown as SQLite.SQLiteDatabase;

    const count = await upsertLocalAssets(db, [
      {
        localAssetId: 'asset-1',
        uri: 'ph://asset-1',
        createdAt: '2026-05-17T03:30:00.000Z',
        width: 1920,
        height: 1080,
        mediaType: 'photo',
      },
    ]);

    expect(count).toBe(1);
    expect(runAsync).toHaveBeenCalledTimes(1);
    expect(runAsync.mock.calls[0]?.[1]).toEqual([
      'asset-1',
      'ph://asset-1',
      '2026-05-17T03:30:00.000Z',
      1920,
      1080,
      'photo',
      'pending',
      null,
      0,
      null,
      null,
    ]);
  });
});

describe('getLocalAssetsByIds', () => {
  it('queries asset scoring inputs by ID', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    await getLocalAssetsByIds(db, ['asset-1', 'asset-2']);

    expect(getAllAsync).toHaveBeenCalledWith(expect.any(String), [
      'asset-1',
      'asset-2',
    ]);
    expect(getAllAsync.mock.calls[0]?.[0]).toContain(
      'local_asset_id IN (?, ?)',
    );
  });

  it('returns early when there are no IDs to query', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(getLocalAssetsByIds(db, [])).resolves.toEqual([]);
    expect(getAllAsync).not.toHaveBeenCalled();
  });
});

describe('countPendingLocalAssetsForDetection', () => {
  it('returns the number of pending photo assets', async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({ count: 12 });
    const db = { getFirstAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(countPendingLocalAssetsForDetection(db)).resolves.toBe(12);
    expect(getFirstAsync.mock.calls[0]?.[0]).toContain(
      "processing_status = 'pending'",
    );
  });
});

describe('getPendingLocalAssetsForDetection', () => {
  it('queries pending photo assets newest first with a limit', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    await getPendingLocalAssetsForDetection(db, 25);

    expect(getAllAsync).toHaveBeenCalledWith(expect.any(String), [25]);
    expect(getAllAsync.mock.calls[0]?.[0]).toContain(
      "processing_status = 'pending'",
    );
    expect(getAllAsync.mock.calls[0]?.[0]).toContain(
      'ORDER BY created_at DESC',
    );
  });
});

describe('updateLocalAssetDetectionResults', () => {
  it('marks processed assets with pet candidate results', async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    const db = { runAsync } as unknown as SQLite.SQLiteDatabase;

    const count = await updateLocalAssetDetectionResults(db, [
      {
        localAssetId: 'asset-1',
        isPetCandidate: true,
        petConfidence: 0.82,
        detectedPetType: 'dog',
        detectionSource: 'native',
        detectionDebugLabel: 'dog',
      },
    ]);

    expect(count).toBe(1);
    expect(runAsync).toHaveBeenCalledWith(expect.any(String), [
      1,
      0.82,
      'dog',
      'native',
      'dog',
      'asset-1',
    ]);
  });
});

describe('resetLocalAssetsForRedetection', () => {
  it('marks saved photos as pending and clears detection fields', async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 4 });
    const db = { runAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(resetLocalAssetsForRedetection(db)).resolves.toBe(4);

    expect(runAsync.mock.calls[0]?.[0]).toContain(
      "processing_status = 'pending'",
    );
    expect(runAsync.mock.calls[0]?.[0]).toContain('is_pet_candidate = 0');
    expect(runAsync.mock.calls[0]?.[0]).toContain('detected_pet_type = NULL');
    expect(runAsync.mock.calls[0]?.[0]).toContain("media_type = 'photo'");
  });
});

describe('countLocalPetCandidates', () => {
  it('returns the number of marked pet candidates', async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({ count: 7 });
    const db = { getFirstAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(countLocalPetCandidates(db)).resolves.toBe(7);
    expect(getFirstAsync).toHaveBeenCalledWith(expect.any(String), [0.35]);
  });
});

describe('getLocalPetCandidateAssets', () => {
  it('queries marked pet candidates newest first', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    await getLocalPetCandidateAssets(db);

    expect(getAllAsync).toHaveBeenCalledWith(expect.any(String), [0.35]);
    expect(getAllAsync.mock.calls[0]?.[0]).toContain('is_pet_candidate = 1');
    expect(getAllAsync.mock.calls[0]?.[0]).toContain(
      'ORDER BY created_at DESC',
    );
  });
});
