import { describe, expect, it } from 'vitest';

import {
  isBootstrapTimelineResponse,
  parseBootstrapTimelineRequest,
} from './bootstrap-timeline';

describe('bootstrap-timeline contracts', () => {
  it('parses an empty request', () => {
    expect(parseBootstrapTimelineRequest({})).toEqual({});
  });

  it('accepts a valid bootstrap response', () => {
    expect(
      isBootstrapTimelineResponse({
        events: [
          {
            event_id: 'evt-1',
            source_local_event_id: 'local_evt_1',
            pet_id: 'pet-1',
            timestamp: '2026-05-18T12:00:00.000Z',
            source: 'camera_roll',
            event_type: 'play',
            caption: 'Playtime',
            caption_source: 'ai',
            is_favorite: false,
            sync_version: 1,
            updated_at: '2026-05-18T12:05:00.000Z',
            user_edited_caption: false,
            user_edited_event_type: false,
            pet_validation_status: 'valid',
            deleted_at: null,
            media: [
              {
                source_local_asset_id: 'asset-1',
                thumbnail_url: 'https://example.com/thumb.jpg',
                width: 400,
                height: 400,
                is_primary: true,
                detected_pet_type: 'cat',
              },
            ],
          },
        ],
        next_cursor: null,
      }),
    ).toBe(true);
  });
});
