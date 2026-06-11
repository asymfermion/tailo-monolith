import type * as SQLite from 'expo-sqlite';

import {
  getMaxQualifiedLocalEventCountByDetectedPetType,
  getQualifiedLocalEventCountByDetectedPetType,
  getMaxLocalEventCountByDetectedPetType,
  upsertLocalEvents,
} from './localEvents';

describe('upsertLocalEvents', () => {
  it('persists promoted events with defaults', async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    const db = { runAsync } as unknown as SQLite.SQLiteDatabase;

    await upsertLocalEvents(db, [
      {
        localEventId: 'local-event-1',
        petId: 'local_pet_1',
        timestamp: '2026-05-17T03:30:00.000Z',
        source: 'camera_roll',
        selectedAssetIds: ['asset-1', 'asset-2'],
        processingState: 'processed',
      },
    ]);

    expect(runAsync).toHaveBeenCalledWith(expect.any(String), [
      'local-event-1',
      'local_pet_1',
      '2026-05-17T03:30:00.000Z',
      'camera_roll',
      'unknown',
      null,
      null,
      null,
      0,
      'processed',
      JSON.stringify(['asset-1', 'asset-2']),
    ]);
  });
});

describe('getMaxLocalEventCountByDetectedPetType', () => {
  it('returns the largest promoted count for a single detected pet type', async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({ count: 10 });
    const db = { getFirstAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(getMaxLocalEventCountByDetectedPetType(db)).resolves.toBe(10);
    expect(getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('MAX(type_count)'),
    );
    expect(getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("assets.detected_pet_type IN ('dog', 'cat')"),
    );
  });
});

describe('qualified pet-type counts', () => {
  it('queries max count with primary overall score threshold', async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({ count: 7 });
    const db = { getFirstAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(
      getMaxQualifiedLocalEventCountByDetectedPetType(db, 0.58),
    ).resolves.toBe(7);
    expect(getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('scores.overall_score >= ?'),
      [0.58],
    );
  });

  it('queries count for a specific pet type with score threshold', async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({ count: 4 });
    const db = { getFirstAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(
      getQualifiedLocalEventCountByDetectedPetType(db, 'dog', 0.58),
    ).resolves.toBe(4);
    expect(getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('assets.detected_pet_type = ?'),
      [0.58, 'dog'],
    );
  });
});
