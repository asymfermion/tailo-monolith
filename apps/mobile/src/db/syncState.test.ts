import type * as SQLite from 'expo-sqlite';

import {
  getPipelinePhase,
  getScanProgress,
  saveScanProgress,
  setPipelinePhase,
  SYNC_STATE_KEYS,
} from './syncState';

describe('syncState', () => {
  it('stores pipeline phase and scan progress', async () => {
    const values = new Map<string, string>();
    const db = {
      getFirstAsync: jest.fn(async (sql: string, params: string[]) => {
        if (sql.includes('state_value')) {
          return { stateValue: values.get(params[0] ?? '') ?? null };
        }
        return null;
      }),
      runAsync: jest.fn(async (sql: string, params: string[]) => {
        if (sql.includes('INSERT INTO sync_state')) {
          values.set(params[0] ?? '', params[1] ?? '');
        }
        if (sql.includes('DELETE FROM sync_state')) {
          values.delete(params[0] ?? '');
        }
      }),
    } as unknown as SQLite.SQLiteDatabase;

    await setPipelinePhase(db, 'scan');
    await expect(getPipelinePhase(db)).resolves.toBe('scan');

    await saveScanProgress(db, {
      mode: 'recent',
      after: 'cursor-1',
      hasNextPage: true,
    });

    await expect(getScanProgress(db)).resolves.toEqual({
      mode: 'recent',
      after: 'cursor-1',
      hasNextPage: true,
    });

    expect(values.get(SYNC_STATE_KEYS.SCAN_MODE)).toBe('recent');
  });
});
