import { describe, expect, it } from 'vitest';

import { mergeSyncEventPayload } from './syncEventMerge';

describe('mergeSyncEventPayload', () => {
  it('preserves user-edited caption on repeat sync from client', () => {
    expect(
      mergeSyncEventPayload({
        callerUserId: 'user-1',
        existing: {
          eventId: 'event-1',
          userId: 'user-1',
          petId: 'pet-1',
          sourceLocalEventId: 'local-event-1',
          timestamp: '2026-05-18T12:00:00.000Z',
          source: 'camera_roll',
          eventType: 'play',
          caption: 'My note',
          captionSource: 'user',
          isFavorite: false,
          userEditedCaption: true,
          userEditedEventType: false,
          syncVersion: 2,
        },
        request: {
          source_local_event_id: 'local-event-1',
          pet_id: 'pet-1',
          timestamp: '2026-05-18T12:00:00.000Z',
          source: 'camera_roll',
          event_type: 'unknown',
          caption: 'AI would overwrite',
          caption_source: 'placeholder',
          is_favorite: false,
          media: [
            {
              source_local_asset_id: 'asset-1',
              storage_path: 'a/original.jpg',
              thumbnail_path: 'a/thumb.jpg',
              width: 100,
              height: 100,
              is_primary: true,
            },
          ],
        },
      }),
    ).toMatchObject({
      caption: 'My note',
      captionSource: 'user',
      userEditedCaption: true,
      nextSyncVersion: 3,
      shouldCreateAiJob: false,
    });
  });

  it('creates a new event payload', () => {
    expect(
      mergeSyncEventPayload({
        callerUserId: 'user-1',
        existing: null,
        request: {
          source_local_event_id: 'local-event-1',
          pet_id: 'pet-1',
          timestamp: '2026-05-18T12:00:00.000Z',
          source: 'camera_roll',
          event_type: 'unknown',
          caption: null,
          caption_source: 'placeholder',
          is_favorite: false,
          media: [
            {
              source_local_asset_id: 'asset-1',
              storage_path: 'a/original.jpg',
              thumbnail_path: 'a/thumb.jpg',
              width: 100,
              height: 100,
              is_primary: true,
            },
          ],
        },
      }),
    ).toMatchObject({
      eventId: expect.any(String),
      nextSyncVersion: 1,
      shouldCreateAiJob: true,
    });
  });
});
