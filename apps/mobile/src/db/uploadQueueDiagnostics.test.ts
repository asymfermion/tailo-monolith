import type * as SQLite from 'expo-sqlite';

import { inspectUploadQueueForeignKeys } from './uploadQueueDiagnostics';

describe('inspectUploadQueueForeignKeys', () => {
  it('reports a missing local_events parent row', async () => {
    const db = {
      getFirstAsync: jest.fn().mockResolvedValue(null),
      getAllAsync: jest.fn().mockResolvedValue([]),
    } as unknown as SQLite.SQLiteDatabase;

    const report = await inspectUploadQueueForeignKeys(db, 'event_1', [
      'asset_a',
    ]);

    expect(report.eventExists).toBe(false);
    expect(report.missingAssetIds).toEqual(['asset_a']);
  });

  it('reports asset ids missing from local_assets', async () => {
    const db = {
      getFirstAsync: jest.fn().mockResolvedValue({ localEventId: 'event_1' }),
      getAllAsync: jest.fn().mockResolvedValue([{ id: 'asset_a' }]),
    } as unknown as SQLite.SQLiteDatabase;

    const report = await inspectUploadQueueForeignKeys(db, 'event_1', [
      'asset_a',
      'asset_b',
    ]);

    expect(report.eventExists).toBe(true);
    expect(report.missingAssetIds).toEqual(['asset_b']);
    expect(report.existingAssetIds).toEqual(['asset_a']);
  });
});
