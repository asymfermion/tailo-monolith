import type * as SQLite from 'expo-sqlite';

import { getNewestPromotedEventTimestamp } from '@/db/localEvents';

import { resolveIncrementalScanCreatedAfterMs } from './incrementalScan';
import { getLastScanTimestamp } from './scanState';

jest.mock('@/db/localEvents', () => ({
  getNewestPromotedEventTimestamp: jest.fn(),
}));

jest.mock('./scanState', () => ({
  getLastScanTimestamp: jest.fn(),
}));

const mockedGetNewestPromotedEventTimestamp =
  getNewestPromotedEventTimestamp as jest.MockedFunction<
    typeof getNewestPromotedEventTimestamp
  >;
const mockedGetLastScanTimestamp = getLastScanTimestamp as jest.MockedFunction<
  typeof getLastScanTimestamp
>;

describe('resolveIncrementalScanCreatedAfterMs', () => {
  const database = {} as SQLite.SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when there is no timeline or prior scan', async () => {
    mockedGetNewestPromotedEventTimestamp.mockResolvedValue(null);
    mockedGetLastScanTimestamp.mockResolvedValue(null);

    await expect(
      resolveIncrementalScanCreatedAfterMs(database),
    ).resolves.toBeNull();
  });

  it('uses the newest promoted event timestamp', async () => {
    mockedGetNewestPromotedEventTimestamp.mockResolvedValue(
      '2026-05-10T12:00:00.000Z',
    );
    mockedGetLastScanTimestamp.mockResolvedValue(null);

    await expect(resolveIncrementalScanCreatedAfterMs(database)).resolves.toBe(
      Date.parse('2026-05-10T12:00:00.000Z'),
    );
  });

  it('uses the later of event timestamp and last scan timestamp', async () => {
    mockedGetNewestPromotedEventTimestamp.mockResolvedValue(
      '2026-05-10T12:00:00.000Z',
    );
    mockedGetLastScanTimestamp.mockResolvedValue('2026-05-15T08:00:00.000Z');

    await expect(resolveIncrementalScanCreatedAfterMs(database)).resolves.toBe(
      Date.parse('2026-05-15T08:00:00.000Z'),
    );
  });
});
