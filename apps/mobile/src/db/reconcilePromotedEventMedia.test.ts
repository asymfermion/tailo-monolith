import type * as SQLite from 'expo-sqlite';

import { reconcilePromotedEventMediaForProfile } from './reconcilePromotedEventMedia';

describe('reconcilePromotedEventMediaForProfile', () => {
  it('removes invalid scores, updates selected assets, and deletes empty events', async () => {
    const runAsync = jest
      .fn()
      .mockResolvedValueOnce({ changes: 2 })
      .mockResolvedValue({ changes: 0 });
    const getAllAsync = jest
      .fn()
      .mockResolvedValueOnce([
        {
          localEventId: 'event-1',
          selectedAssetIds: JSON.stringify(['a1', 'a2', 'a3']),
        },
      ])
      .mockResolvedValueOnce([{ localAssetId: 'a1' }]);
    const db = {
      runAsync,
      getAllAsync,
    } as unknown as SQLite.SQLiteDatabase;

    const result = await reconcilePromotedEventMediaForProfile(db, 'dog');

    expect(result.removedScoreCount).toBe(2);
    expect(result.updatedEventCount).toBe(1);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE local_events'),
      [JSON.stringify(['a1']), 'event-1'],
    );
  });
});
