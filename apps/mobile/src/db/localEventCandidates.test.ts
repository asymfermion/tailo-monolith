import type * as SQLite from 'expo-sqlite';

import {
  clearLocalEventPipeline,
  getScorableLocalEventCandidates,
  updateLocalEventCandidateSelection,
  upsertLocalEventCandidates,
} from './localEventCandidates';

describe('clearLocalEventPipeline', () => {
  it('removes scored events and media scores', async () => {
    const execAsync = jest.fn().mockResolvedValue(undefined);
    const db = { execAsync } as unknown as SQLite.SQLiteDatabase;

    await clearLocalEventPipeline(db);

    expect(execAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM local_media_scores'),
    );
    expect(execAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM local_events'),
    );
    expect(execAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM local_event_candidates'),
    );
  });
});

describe('upsertLocalEventCandidates', () => {
  it('persists event candidates with JSON encoded selected asset IDs', async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    const db = { runAsync } as unknown as SQLite.SQLiteDatabase;

    const count = await upsertLocalEventCandidates(db, [
      {
        localEventId: 'local-event-1',
        timestamp: '2026-05-17T03:30:00.000Z',
        source: 'camera_roll',
        selectedAssetIds: ['asset-1', 'asset-2'],
      },
    ]);

    expect(count).toBe(1);
    expect(runAsync).toHaveBeenCalledWith(expect.any(String), [
      'local-event-1',
      '2026-05-17T03:30:00.000Z',
      'camera_roll',
      'pending',
      'pending',
      JSON.stringify(['asset-1', 'asset-2']),
    ]);
  });
});

describe('getScorableLocalEventCandidates', () => {
  it('queries pending candidates newest first', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    await getScorableLocalEventCandidates(db);

    expect(getAllAsync).toHaveBeenCalledWith(expect.any(String));
    expect(getAllAsync.mock.calls[0]?.[0]).toContain(
      "candidate_status IN ('pending', 'clustering')",
    );
    expect(getAllAsync.mock.calls[0]?.[0]).toContain('ORDER BY timestamp DESC');
  });
});

describe('updateLocalEventCandidateSelection', () => {
  it('updates selected asset IDs and candidate status', async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    const db = { runAsync } as unknown as SQLite.SQLiteDatabase;

    await updateLocalEventCandidateSelection(db, 'event-1', ['asset-1']);

    expect(runAsync).toHaveBeenCalledWith(expect.any(String), [
      JSON.stringify(['asset-1']),
      'scored',
      'event-1',
    ]);
  });
});
