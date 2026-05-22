import { describe, expect, it } from 'vitest';

import {
  isRemoteEventSoftDeleted,
  type RemoteEventUpdate,
} from './get-event-updates.ts';

const base: RemoteEventUpdate = {
  event_id: 'remote-1',
  source_local_event_id: 'local-1',
  event_type: 'unknown',
  caption: null,
  caption_source: 'placeholder',
  is_favorite: false,
  sync_version: 1,
  updated_at: '2026-05-20T12:00:00.000Z',
  user_edited_caption: false,
  user_edited_event_type: false,
  ai_job_status: 'done',
  pet_validation_status: 'rejected',
  deleted_at: null,
};

describe('isRemoteEventSoftDeleted', () => {
  it('returns false when deleted_at is null', () => {
    expect(isRemoteEventSoftDeleted(base)).toBe(false);
  });

  it('returns true when deleted_at is set', () => {
    expect(
      isRemoteEventSoftDeleted({
        ...base,
        deleted_at: '2026-05-20T12:01:00.000Z',
      }),
    ).toBe(true);
  });
});
