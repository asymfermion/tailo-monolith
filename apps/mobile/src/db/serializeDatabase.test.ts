import type * as SQLite from 'expo-sqlite';

import { createSerializedDatabase } from './serializeDatabase';

describe('createSerializedDatabase', () => {
  it('runs concurrent async queries one at a time', async () => {
    const order: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const database = {
      runAsync: jest.fn(async (label: string) => {
        order.push(`start:${label}`);
        if (label === 'first') {
          await firstGate;
        }
        order.push(`end:${label}`);
        return { changes: 1 };
      }),
    } as unknown as SQLite.SQLiteDatabase;

    const serialized = createSerializedDatabase(database);

    const first = serialized.runAsync('first');
    const second = serialized.runAsync('second');

    await Promise.resolve();
    expect(order).toEqual(['start:first']);

    releaseFirst?.();
    await Promise.all([first, second]);

    expect(order).toEqual([
      'start:first',
      'end:first',
      'start:second',
      'end:second',
    ]);
  });
});
