import type * as SQLite from 'expo-sqlite';

import { deletePromotedLocalEvent, getLocalEventById } from '@/db/localEvents';

import { applyRemoteEventUpdates } from './applyRemoteEventUpdates';

jest.mock('@/db/localEvents', () => ({
  getLocalEventById: jest.fn(),
  deletePromotedLocalEvent: jest.fn(),
}));

describe('applyRemoteEventUpdates', () => {
  const database = {} as SQLite.SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes local timeline event when cloud pet validation rejects', async () => {
    jest.mocked(getLocalEventById).mockResolvedValue({
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
      selectedAssetIds: '["a1"]',
      remoteEventId: 'remote-1',
      serverSyncVersion: 1,
      captionSource: 'placeholder',
      userEditedCaption: 0,
      userEditedEventType: 0,
      pendingAi: 0,
    });

    const applied = await applyRemoteEventUpdates(database, [
      {
        event_id: 'remote-1',
        source_local_event_id: 'event-1',
        event_type: 'unknown',
        caption: null,
        caption_source: 'placeholder',
        is_favorite: false,
        sync_version: 2,
        updated_at: '2026-05-19T12:00:00.000Z',
        user_edited_caption: false,
        user_edited_event_type: false,
        ai_job_status: 'done',
        pet_validation_status: 'rejected',
      },
    ]);

    expect(applied).toBe(1);
    expect(deletePromotedLocalEvent).toHaveBeenCalledWith(database, 'event-1');
  });
});
