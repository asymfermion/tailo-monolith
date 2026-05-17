import type * as SQLite from 'expo-sqlite';

import { upsertLocalMediaScores } from './localMediaScores';

describe('upsertLocalMediaScores', () => {
  it('persists score rows and primary image flags', async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    const db = { runAsync } as unknown as SQLite.SQLiteDatabase;

    const count = await upsertLocalMediaScores(db, [
      {
        localAssetId: 'asset-1',
        localEventId: 'event-1',
        sharpness: 0.8,
        brightness: 0.7,
        subjectVisibility: 0.9,
        uniqueness: 1,
        overallScore: 0.86,
        isPrimary: true,
      },
    ]);

    expect(count).toBe(1);
    expect(runAsync).toHaveBeenCalledWith(expect.any(String), [
      'asset-1',
      'event-1',
      0.8,
      0.7,
      0.9,
      1,
      0.86,
      1,
    ]);
  });
});
