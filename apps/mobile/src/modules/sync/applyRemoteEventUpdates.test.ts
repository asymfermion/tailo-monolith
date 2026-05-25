import type * as SQLite from 'expo-sqlite';

import { getLocalEventById, markLocalEventDeleted } from '@/db/localEvents';
import { isLocalEventTombstoned } from '@/db/localEventTombstones';

import { applyRemoteEventUpdates } from './applyRemoteEventUpdates';
import { hydrateRemoteEventsBySourceLocalEventIds } from './hydratedCloudEvents';

jest.mock('@/db/localEvents', () => ({
  getLocalEventById: jest.fn(),
  markLocalEventDeleted: jest.fn(),
}));

jest.mock('@/db/localEventTombstones', () => ({
  isLocalEventTombstoned: jest.fn(),
}));

jest.mock('@/db/eventSyncLock', () => ({
  acquireEventSyncLock: jest.fn(),
}));

jest.mock('./hydratedCloudEvents', () => ({
  hydrateRemoteEventsBySourceLocalEventIds: jest.fn(),
}));

describe('applyRemoteEventUpdates', () => {
  const database = {} as SQLite.SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isLocalEventTombstoned).mockResolvedValue(false);
    jest
      .mocked(hydrateRemoteEventsBySourceLocalEventIds)
      .mockResolvedValue({ status: 'ok', hydratedCount: 0 });
  });

  it('hydrates unknown remote moments with media when poll sees missing local rows', async () => {
    jest.mocked(getLocalEventById).mockResolvedValue(null);
    jest
      .mocked(hydrateRemoteEventsBySourceLocalEventIds)
      .mockResolvedValue({ status: 'ok', hydratedCount: 1 });

    const applied = await applyRemoteEventUpdates(database, [
      {
        event_id: 'remote-2',
        source_local_event_id: 'event-missing',
        event_type: 'play',
        caption: 'Cloud caption',
        caption_source: 'ai',
        is_favorite: false,
        sync_version: 2,
        updated_at: '2026-05-20T12:00:00.000Z',
        user_edited_caption: false,
        user_edited_event_type: false,
        ai_job_status: 'done',
        pet_validation_status: 'valid',
        deleted_at: null,
      },
    ]);

    expect(hydrateRemoteEventsBySourceLocalEventIds).toHaveBeenCalledWith(
      database,
      ['event-missing'],
    );
    expect(applied).toBe(1);
  });

  it('does not hydrate missing events when cloud row is soft-deleted or rejected', async () => {
    jest.mocked(getLocalEventById).mockResolvedValue(null);

    const applied = await applyRemoteEventUpdates(database, [
      {
        event_id: 'remote-1',
        source_local_event_id: 'event-soft-deleted',
        event_type: 'unknown',
        caption: null,
        caption_source: 'placeholder',
        is_favorite: false,
        sync_version: 1,
        updated_at: '2026-05-20T12:00:00.000Z',
        user_edited_caption: false,
        user_edited_event_type: false,
        ai_job_status: 'done',
        pet_validation_status: 'valid',
        deleted_at: '2026-05-20T12:00:00.000Z',
      },
      {
        event_id: 'remote-2',
        source_local_event_id: 'event-rejected',
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
      },
    ]);

    expect(hydrateRemoteEventsBySourceLocalEventIds).not.toHaveBeenCalled();
    expect(applied).toBe(0);
  });

  it('soft-deletes local moment when cloud sends deleted_at', async () => {
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
      pendingAi: 1,
      syncLockOwner: 'user',
      pendingCloudSync: 1,
      deletedAt: null,
    });

    const deletedAt = '2026-05-20T12:00:00.000Z';
    const applied = await applyRemoteEventUpdates(database, [
      {
        event_id: 'remote-1',
        source_local_event_id: 'event-1',
        event_type: 'unknown',
        caption: null,
        caption_source: 'placeholder',
        is_favorite: false,
        sync_version: 2,
        updated_at: deletedAt,
        user_edited_caption: false,
        user_edited_event_type: false,
        ai_job_status: 'done',
        pet_validation_status: 'rejected',
        deleted_at: deletedAt,
      },
    ]);

    expect(applied).toBe(1);
    expect(markLocalEventDeleted).toHaveBeenCalledWith(
      database,
      'event-1',
      deletedAt,
    );
  });

  it('skips soft-delete when local moment is already deleted', async () => {
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
      selectedAssetIds: '[]',
      remoteEventId: 'remote-1',
      serverSyncVersion: 1,
      captionSource: 'placeholder',
      userEditedCaption: 0,
      userEditedEventType: 0,
      pendingAi: 0,
      syncLockOwner: null,
      pendingCloudSync: 0,
      deletedAt: '2026-05-20T11:00:00.000Z',
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
        updated_at: '2026-05-20T12:00:00.000Z',
        user_edited_caption: false,
        user_edited_event_type: false,
        ai_job_status: 'done',
        pet_validation_status: 'rejected',
        deleted_at: '2026-05-20T12:00:00.000Z',
      },
    ]);

    expect(applied).toBe(0);
    expect(markLocalEventDeleted).not.toHaveBeenCalled();
  });

  it('skips remote updates for tombstoned events', async () => {
    jest.mocked(getLocalEventById).mockResolvedValue({
      localEventId: 'event-1',
      petId: 'pet-1',
      timestamp: '2026-05-19T12:00:00.000Z',
      source: 'camera_roll',
      eventType: 'unknown',
      caption: 'Keep me',
      captionLanguage: null,
      confidence: null,
      isFavorite: 0,
      processingState: 'processed',
      selectedAssetIds: '[]',
      remoteEventId: 'remote-1',
      serverSyncVersion: 1,
      captionSource: 'user',
      userEditedCaption: 1,
      userEditedEventType: 0,
      pendingAi: 0,
      syncLockOwner: null,
      pendingCloudSync: 0,
      deletedAt: null,
    });
    jest.mocked(isLocalEventTombstoned).mockResolvedValue(true);

    const applied = await applyRemoteEventUpdates(database, [
      {
        event_id: 'remote-1',
        source_local_event_id: 'event-1',
        event_type: 'play',
        caption: 'Cloud caption',
        caption_source: 'ai',
        is_favorite: false,
        sync_version: 5,
        updated_at: '2026-05-19T12:00:00.000Z',
        user_edited_caption: false,
        user_edited_event_type: false,
        ai_job_status: 'done',
        pet_validation_status: 'valid',
        deleted_at: null,
      },
    ]);

    expect(applied).toBe(0);
  });

  it('skips remote updates when user holds sync lock', async () => {
    jest.mocked(getLocalEventById).mockResolvedValue({
      localEventId: 'event-1',
      petId: 'pet-1',
      timestamp: '2026-05-19T12:00:00.000Z',
      source: 'camera_roll',
      eventType: 'unknown',
      caption: 'User caption',
      captionLanguage: null,
      confidence: null,
      isFavorite: 0,
      processingState: 'processed',
      selectedAssetIds: '[]',
      remoteEventId: 'remote-1',
      serverSyncVersion: 1,
      captionSource: 'user',
      userEditedCaption: 1,
      userEditedEventType: 0,
      pendingAi: 0,
      syncLockOwner: 'user',
      pendingCloudSync: 0,
      deletedAt: null,
    });

    const applied = await applyRemoteEventUpdates(database, [
      {
        event_id: 'remote-1',
        source_local_event_id: 'event-1',
        event_type: 'play',
        caption: 'Cloud caption',
        caption_source: 'ai',
        is_favorite: false,
        sync_version: 5,
        updated_at: '2026-05-19T12:00:00.000Z',
        user_edited_caption: false,
        user_edited_event_type: false,
        ai_job_status: 'done',
        pet_validation_status: 'valid',
        deleted_at: null,
      },
    ]);

    expect(applied).toBe(0);
  });
});
