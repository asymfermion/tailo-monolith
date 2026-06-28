import * as MediaLibrary from 'expo-media-library/legacy';
import type * as SQLite from 'expo-sqlite';

import { repairHydratedTimelineData } from './repairHydratedTimelineData';

jest.mock('expo-media-library/legacy', () => ({
  isAvailableAsync: jest.fn(),
  getAssetInfoAsync: jest.fn(),
}));

describe('repairHydratedTimelineData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(MediaLibrary.isAvailableAsync).mockResolvedValue(true);
  });

  it('restores device URIs and timestamps from candidates', async () => {
    jest.mocked(MediaLibrary.getAssetInfoAsync).mockResolvedValue({
      uri: 'ph://asset-1',
      creationTime: Date.parse('2026-05-17T03:30:00.000Z'),
    } as Awaited<ReturnType<typeof MediaLibrary.getAssetInfoAsync>>);

    const runAsync = jest.fn().mockResolvedValue(undefined);
    const getAllAsync = jest
      .fn()
      .mockResolvedValueOnce([
        {
          localAssetId: 'asset-1',
          uri: 'https://signed.example.com/thumb.jpg',
          createdAt: '2026-05-19T12:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          localEventId: 'event-1',
          candidateTimestamp: '2026-05-17T03:30:00.000Z',
          eventTimestamp: '2026-05-19T12:00:00.000Z',
        },
      ]);

    const database = {
      runAsync,
      getAllAsync,
    } as unknown as SQLite.SQLiteDatabase;

    await expect(repairHydratedTimelineData(database)).resolves.toEqual({
      repairedAssetUris: 1,
      repairedEventTimestamps: 1,
    });

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE local_assets'),
      ['ph://asset-1', '2026-05-17T03:30:00.000Z', 'asset-1'],
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE local_events'),
      ['2026-05-17T03:30:00.000Z', 'event-1'],
    );
  });

  it('returns zero when nothing needs repair', async () => {
    const database = {
      runAsync: jest.fn(),
      getAllAsync: jest.fn().mockResolvedValue([]),
    } as unknown as SQLite.SQLiteDatabase;

    await expect(repairHydratedTimelineData(database)).resolves.toEqual({
      repairedAssetUris: 0,
      repairedEventTimestamps: 0,
    });
  });
});
