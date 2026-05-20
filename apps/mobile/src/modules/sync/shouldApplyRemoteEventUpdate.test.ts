import type { RemoteEventUpdate } from '@tailo/shared';

import type { LocalEventRow } from '@/db/localEvents';

import {
  getRemoteEventApplyBlockReason,
  shouldApplyRemoteEventUpdate,
} from './shouldApplyRemoteEventUpdate';

const remote: RemoteEventUpdate = {
  event_id: 'remote-1',
  source_local_event_id: 'event-1',
  event_type: 'unknown',
  caption: 'AI caption',
  caption_source: 'ai',
  is_favorite: false,
  sync_version: 2,
  updated_at: '2026-05-19T12:00:00.000Z',
  user_edited_caption: false,
  user_edited_event_type: false,
  ai_job_status: 'done',
  pet_validation_status: 'valid',
};

const local: LocalEventRow = {
  localEventId: 'event-1',
  petId: 'pet-1',
  timestamp: '2026-05-19T12:00:00.000Z',
  source: 'camera_roll',
  eventType: 'unknown',
  caption: null,
  captionLanguage: null,
  confidence: null,
  isFavorite: 0,
  processingState: 'processed',
  selectedAssetIds: '[]',
  remoteEventId: 'remote-1',
  serverSyncVersion: 1,
  captionSource: 'placeholder',
  userEditedCaption: 0,
  userEditedEventType: 0,
  pendingAi: 0,
  syncLockOwner: null,
};

describe('shouldApplyRemoteEventUpdate', () => {
  it('blocks tombstoned events', () => {
    expect(
      getRemoteEventApplyBlockReason({
        isTombstoned: true,
        local,
        remote,
      }),
    ).toBe('tombstoned');
    expect(
      shouldApplyRemoteEventUpdate({
        isTombstoned: true,
        local,
        remote,
      }),
    ).toBe(false);
  });

  it('blocks when user holds sync lock', () => {
    expect(
      shouldApplyRemoteEventUpdate({
        isTombstoned: false,
        local: { ...local, syncLockOwner: 'user' },
        remote,
      }),
    ).toBe(false);
  });

  it('allows remote merge when not tombstoned and unlocked', () => {
    expect(
      shouldApplyRemoteEventUpdate({
        isTombstoned: false,
        local,
        remote,
      }),
    ).toBe(true);
  });
});
