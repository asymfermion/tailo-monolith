import { describe, expect, it } from 'vitest';

import { parseSyncEventRequest } from './sync-event';

describe('parseSyncEventRequest', () => {
  it('accepts optional media fingerprint', () => {
    expect(
      parseSyncEventRequest({
        source_local_event_id: 'evt-local-1',
        pet_id: 'pet-1',
        timestamp: '2026-05-25T00:00:00.000Z',
        source: 'camera_roll',
        event_type: 'play',
        caption: null,
        caption_source: 'placeholder',
        is_favorite: false,
        media: [
          {
            source_local_asset_id: 'asset-1',
            storage_path: 'u/p/e/a1/original.jpg',
            thumbnail_path: 'u/p/e/a1/thumb.jpg',
            media_fingerprint: 'md5:abc123',
            width: 100,
            height: 100,
            is_primary: true,
          },
        ],
      }),
    ).toMatchObject({
      media: [
        expect.objectContaining({
          media_fingerprint: 'md5:abc123',
        }),
      ],
    });
  });
});
