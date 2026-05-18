import type * as SQLite from 'expo-sqlite';

import { pruneLocalTimelineForProfilePetType } from './localEvents';

describe('pruneLocalTimelineForProfilePetType', () => {
  it('removes non-matching scores and events without a matching primary', async () => {
    const runAsync = jest
      .fn()
      .mockResolvedValueOnce({ changes: 3 })
      .mockResolvedValueOnce({ changes: 1 });
    const db = { runAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(
      pruneLocalTimelineForProfilePetType(db, 'dog'),
    ).resolves.toEqual({
      removedEventCount: 1,
      removedScoreCount: 3,
    });

    expect(runAsync.mock.calls[0]?.[1]).toEqual(['dog']);
    expect(runAsync.mock.calls[1]?.[1]).toEqual(['dog']);
  });
});
