import type { RemoteEventUpdate } from '@tailo/shared';

import {
  mergeRemoteEventUpdate,
  type LocalEventSyncSnapshot,
} from './mergeRemoteEventUpdate';

const baseLocal: LocalEventSyncSnapshot = {
  localEventId: 'event-1',
  remoteEventId: 'remote-1',
  eventType: 'unknown',
  caption: 'My caption',
  captionSource: 'user',
  isFavorite: false,
  serverSyncVersion: 2,
  userEditedCaption: true,
  userEditedEventType: false,
  pendingAi: false,
};

const baseRemote: RemoteEventUpdate = {
  event_id: 'remote-1',
  source_local_event_id: 'event-1',
  event_type: 'play',
  caption: 'AI wrote this',
  caption_source: 'ai',
  is_favorite: true,
  sync_version: 3,
  updated_at: '2026-05-18T12:00:00.000Z',
  user_edited_caption: false,
  user_edited_event_type: false,
  ai_job_status: 'done',
};

describe('mergeRemoteEventUpdate', () => {
  it('keeps user-edited caption when remote sends AI caption', () => {
    const merged = mergeRemoteEventUpdate(baseLocal, baseRemote);

    expect(merged.caption).toBe('My caption');
    expect(merged.eventType).toBe('play');
    expect(merged.isFavorite).toBe(true);
    expect(merged.serverSyncVersion).toBe(3);
  });

  it('applies AI caption when user has not edited', () => {
    const merged = mergeRemoteEventUpdate(
      {
        ...baseLocal,
        userEditedCaption: false,
        caption: null,
        captionSource: 'placeholder',
      },
      baseRemote,
    );

    expect(merged.caption).toBe('AI wrote this');
    expect(merged.captionSource).toBe('ai');
  });

  it('marks pending AI while job is processing', () => {
    const merged = mergeRemoteEventUpdate(baseLocal, {
      ...baseRemote,
      ai_job_status: 'processing',
    });

    expect(merged.pendingAi).toBe(true);
  });
});
