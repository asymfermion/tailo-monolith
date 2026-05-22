import type * as SQLite from 'expo-sqlite';
import { pickPlaceholderCaption } from '@tailo/ai';

import { getTimelineEventById, getTimelineEvents } from './timelineEvents';

describe('getTimelineEvents', () => {
  it('resolves promoted local events into timeline events', async () => {
    const getAllAsync = jest
      .fn()
      .mockResolvedValueOnce([
        {
          localEventId: 'event-1',
          timestamp: '2026-05-17T03:30:00.000Z',
          source: 'camera_roll',
          eventType: 'unknown',
          caption: null,
          captionSource: null,
          isFavorite: 0,
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
          detectedPetType: 'dog',
          petConfidence: 0.91,
          overallScore: 0.9,
          isPetCandidate: 1,
          detectionDebugLabel: 'AnimalLabel:dog 0.91',
        },
        {
          localAssetId: 'asset-1',
          uri: 'ph://asset-1',
          width: 1920,
          height: 1080,
          isPrimary: 0,
          detectedPetType: 'dog',
          petConfidence: 0.72,
          overallScore: 0.8,
          isPetCandidate: 1,
          detectionDebugLabel: null,
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
        caption: pickPlaceholderCaption('event-1'),
        captionSource: null,
        isFavorite: false,
        media: [
          {
            localAssetId: 'asset-1',
            uri: 'ph://asset-1',
            width: 1920,
            height: 1080,
            isPrimary: false,
            detectedPetType: 'dog',
            petConfidence: 0.72,
            overallScore: 0.8,
            isPetCandidate: true,
            detectionDebugLabel: null,
          },
          {
            localAssetId: 'asset-2',
            uri: 'ph://asset-2',
            width: 1080,
            height: 1080,
            isPrimary: true,
            detectedPetType: 'dog',
            petConfidence: 0.91,
            overallScore: 0.9,
            isPetCandidate: true,
            detectionDebugLabel: 'AnimalLabel:dog 0.91',
          },
        ],
      },
    ]);
  });

  it('filters to favorite events when requested', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    await getTimelineEvents(db, { favoritesOnly: true });

    expect(getAllAsync.mock.calls[0]?.[0]).toContain('is_favorite = 1');
  });

  it('only loads events whose primary media matches the profile pet type', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    await getTimelineEvents(db, { profilePetType: 'dog' });

    expect(getAllAsync.mock.calls[0]?.[0]).toContain('scores.is_primary = 1');
    expect(getAllAsync.mock.calls[0]?.[0]).toContain('detected_pet_type = ?');
    expect(getAllAsync.mock.calls[0]?.[1]).toEqual(['dog']);
  });

  it('only includes media matching the profile pet type', async () => {
    const getAllAsync = jest
      .fn()
      .mockResolvedValueOnce([
        {
          localEventId: 'event-1',
          timestamp: '2026-05-17T03:30:00.000Z',
          source: 'camera_roll',
          eventType: 'unknown',
          caption: null,
          captionSource: null,
          isFavorite: 0,
          selectedAssetIds: JSON.stringify(['asset-dog', 'asset-cat']),
        },
      ])
      .mockResolvedValueOnce([
        {
          localAssetId: 'asset-dog',
          uri: 'ph://asset-dog',
          width: 1080,
          height: 1080,
          isPrimary: 1,
          detectedPetType: 'dog',
          petConfidence: 0.88,
          overallScore: 0.9,
          isPetCandidate: 1,
          detectionDebugLabel: null,
        },
      ]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    const events = await getTimelineEvents(db, { profilePetType: 'dog' });

    expect(events).toHaveLength(1);
    expect(events[0]?.media).toHaveLength(1);
    expect(events[0]?.media[0]?.localAssetId).toBe('asset-dog');
    expect(getAllAsync.mock.calls[1]?.[0]).toContain('is_pet_candidate = 1');
    expect(getAllAsync.mock.calls[1]?.[0]).toContain('detected_pet_type = ?');
    expect(getAllAsync.mock.calls[1]?.[1]).toContain('dog');
  });

  it('skips events with no resolved media', async () => {
    const getAllAsync = jest
      .fn()
      .mockResolvedValueOnce([
        {
          localEventId: 'event-1',
          timestamp: '2026-05-17T03:30:00.000Z',
          source: 'camera_roll',
          eventType: 'unknown',
          caption: null,
          captionSource: null,
          isFavorite: 0,
          selectedAssetIds: JSON.stringify(['asset-1']),
        },
      ])
      .mockResolvedValueOnce([]);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(getTimelineEvents(db)).resolves.toEqual([]);
  });
});

describe('getTimelineEventById', () => {
  it('loads a single timeline event', async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({
      localEventId: 'event-1',
      timestamp: '2026-05-17T03:30:00.000Z',
      source: 'camera_roll',
      eventType: 'walk',
      caption: 'Park visit',
      captionSource: 'user',
      isFavorite: 1,
      selectedAssetIds: JSON.stringify(['asset-1']),
    });
    const getAllAsync = jest.fn().mockResolvedValue([
      {
        localAssetId: 'asset-1',
        uri: 'ph://asset-1',
        width: 1080,
        height: 1080,
        isPrimary: 1,
        detectedPetType: 'cat',
        petConfidence: 0.65,
        overallScore: 0.9,
        isPetCandidate: 1,
        detectionDebugLabel: null,
      },
    ]);
    const db = {
      getFirstAsync,
      getAllAsync,
    } as unknown as SQLite.SQLiteDatabase;

    await expect(getTimelineEventById(db, 'event-1')).resolves.toEqual({
      localEventId: 'event-1',
      timestamp: '2026-05-17T03:30:00.000Z',
      eventType: 'walk',
      source: 'camera_roll',
      caption: 'Park visit',
      captionSource: 'user',
      isFavorite: true,
      media: [
        {
          localAssetId: 'asset-1',
          uri: 'ph://asset-1',
          width: 1080,
          height: 1080,
          isPrimary: true,
          detectedPetType: 'cat',
          petConfidence: 0.65,
          overallScore: 0.9,
          isPetCandidate: true,
          detectionDebugLabel: null,
        },
      ],
    });
  });
});
