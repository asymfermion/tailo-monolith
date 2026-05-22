import type * as SQLite from 'expo-sqlite';

import { updateLocalEvent } from './localEvents';

describe('updateLocalEvent', () => {
  it('updates caption, type, and favorite flag', async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    const db = { runAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(
      updateLocalEvent(db, 'local-event-1', {
        caption: 'Afternoon nap',
        eventType: 'rest',
        isFavorite: true,
      }),
    ).resolves.toBe(true);

    const sql = String(runAsync.mock.calls[0]?.[0]);
    expect(sql).toContain('pending_cloud_sync = 1');
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE local_events SET'),
      expect.arrayContaining(['rest', 'Afternoon nap', 1, 'local-event-1']),
    );
  });

  it('returns false when there is nothing to update', async () => {
    const runAsync = jest.fn();
    const db = { runAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(updateLocalEvent(db, 'local-event-1', {})).resolves.toBe(
      false,
    );
    expect(runAsync).not.toHaveBeenCalled();
  });
});
