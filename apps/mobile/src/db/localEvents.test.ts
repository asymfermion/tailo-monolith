import type * as SQLite from 'expo-sqlite';

import { upsertLocalEvents } from './localEvents';

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
