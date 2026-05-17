import type * as SQLite from 'expo-sqlite';

import { getTimelineEvents } from './timelineEvents';

describe('getTimelineEvents', () => {
  it('resolves scored event candidates into timeline events', async () => {
    const getAllAsync = jest
      .fn()
      .mockResolvedValueOnce([
        {
          localEventId: 'event-1',
          timestamp: '2026-05-17T03:30:00.000Z',
          source: 'camera_roll',
          selectedAssetIds: JSON.stringify(['asset-1', 'asset-2']),
        },
      ])
      .mockResolvedValueOnce([
        {
          localAssetId: 'asset-2',
          uri: 'ph://asset-2',
          width: 1080,
          height: 1080,
          isPrimary: 1,
          overallScore: 0.9,
        },
        {
          localAssetId: 'asset-1',
          uri: 'ph://asset-1',
          width: 1920,
          height: 1080,
          isPrimary: 0,
          overallScore: 0.8,
        },
      ]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    const events = await getTimelineEvents(db);

    expect(events).toEqual([
      {
        localEventId: 'event-1',
        timestamp: '2026-05-17T03:30:00.000Z',
        eventType: 'unknown',
        source: 'camera_roll',
        caption: null,
        isFavorite: false,
        media: [
          {
            localAssetId: 'asset-2',
            uri: 'ph://asset-2',
            width: 1080,
            height: 1080,
            isPrimary: true,
          },
          {
            localAssetId: 'asset-1',
            uri: 'ph://asset-1',
            width: 1920,
            height: 1080,
            isPrimary: false,
          },
        ],
      },
    ]);
  });

  it('skips candidates with no resolved media', async () => {
    const getAllAsync = jest
      .fn()
      .mockResolvedValueOnce([
        {
          localEventId: 'event-1',
          timestamp: '2026-05-17T03:30:00.000Z',
          source: 'camera_roll',
          selectedAssetIds: JSON.stringify(['asset-1']),
        },
      ])
      .mockResolvedValueOnce([]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(getTimelineEvents(db)).resolves.toEqual([]);
  });
});
