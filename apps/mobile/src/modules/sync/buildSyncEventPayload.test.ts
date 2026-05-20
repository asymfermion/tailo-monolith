import type * as SQLite from 'expo-sqlite';

import type { LocalEventRow } from '@/db/localEvents';
import type { UploadQueueRow } from '@/db/uploadQueue';

import { buildSyncEventPayload } from './buildSyncEventPayload';

import { getLocalAssetUploadSourcesByIds } from '@/db/localAssets';
import { getLocalMediaScoresForEvent } from '@/db/localMediaScores';
import * as syncState from '@/db/syncState';

jest.mock('@/db/localAssets', () => ({
  getLocalAssetUploadSourcesByIds: jest.fn(),
}));

jest.mock('@/db/localMediaScores', () => ({
  getLocalMediaScoresForEvent: jest.fn(),
}));

describe('buildSyncEventPayload', () => {
  const database = {} as SQLite.SQLiteDatabase;

  const localEvent: LocalEventRow = {
    localEventId: 'event-1',
    petId: 'pet-local',
    timestamp: '2026-05-18T10:00:00.000Z',
    source: 'camera_roll',
    eventType: 'unknown',
    caption: null,
    captionLanguage: null,
    confidence: null,
    isFavorite: 0,
    processingState: 'processed',
    selectedAssetIds: '["asset-1"]',
    remoteEventId: null,
    serverSyncVersion: 0,
    captionSource: null,
    userEditedCaption: 0,
    userEditedEventType: 0,
    pendingAi: 0,
    syncLockOwner: null,
  };

  const uploadedItems: UploadQueueRow[] = [
    {
      id: 'upload-1',
      localEventId: 'event-1',
      localAssetId: 'asset-1',
      status: 'done',
      retryCount: 0,
      lastError: null,
      storagePath: 'user/pet/event/asset-1/original.jpg',
      thumbnailPath: 'user/pet/event/asset-1/thumb.jpg',
      nextAttemptAt: null,
    },
  ];

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(syncState, 'getTimelineGeneration').mockResolvedValue(2);
    jest.mocked(getLocalAssetUploadSourcesByIds).mockResolvedValue([
      {
        localAssetId: 'asset-1',
        uri: 'file:///asset-1.jpg',
        width: 1280,
        height: 960,
      },
    ]);
    jest.mocked(getLocalMediaScoresForEvent).mockResolvedValue([
      {
        localAssetId: 'asset-1',
        isPrimary: 1,
        detectedPetType: 'cat',
      },
    ]);
  });

  it('returns null when no uploaded items', async () => {
    await expect(
      buildSyncEventPayload(database, localEvent, [], 'pet-remote'),
    ).resolves.toBeNull();
  });

  it('builds sync payload with placeholder caption source', async () => {
    const payload = await buildSyncEventPayload(
      database,
      localEvent,
      uploadedItems,
      'pet-remote',
    );

    expect(payload).toMatchObject({
      source_local_event_id: 'event-1',
      pet_id: 'pet-remote',
      caption_source: 'placeholder',
      user_edited: { caption: false, event_type: false },
      client_timeline_generation: 2,
      media: [
        expect.objectContaining({
          source_local_asset_id: 'asset-1',
          is_primary: true,
        }),
      ],
    });
  });

  it('uses user caption source when caption exists', async () => {
    const payload = await buildSyncEventPayload(
      database,
      { ...localEvent, caption: 'Afternoon nap', userEditedCaption: 1 },
      uploadedItems,
      'pet-remote',
    );

    expect(payload?.caption_source).toBe('user');
    expect(payload?.caption).toBe('Afternoon nap');
  });
});
