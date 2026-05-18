import type * as SQLite from 'expo-sqlite';

import {
  countPendingUploadQueueItems,
  createUploadQueueItemId,
  enqueueUploadQueueItems,
} from './uploadQueue';

describe('uploadQueue', () => {
  it('creates stable upload ids', () => {
    expect(createUploadQueueItemId('event-1', 'asset-1')).toBe(
      'upload_event-1_asset-1',
    );
  });

  it('enqueues pending upload rows', async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    const db = { runAsync } as unknown as SQLite.SQLiteDatabase;

    await enqueueUploadQueueItems(db, [
      {
        localEventId: 'event-1',
        localAssetId: 'asset-1',
      },
    ]);

    expect(runAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['event-1', 'asset-1', 'pending']),
    );
  });

  it('counts pending and failed uploads', async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({ count: 2 });
    const db = { getFirstAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(countPendingUploadQueueItems(db)).resolves.toBe(2);
  });
});
