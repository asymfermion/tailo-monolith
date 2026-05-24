import { acquireEventSyncLock } from '@/db/eventSyncLock';
import { dismissLocalAssetsForMoment } from '@/db/localAssets';
import { tombstoneLocalEvents } from '@/db/localEventTombstones';
import { getLocalEventById, markLocalEventDeleted } from '@/db/localEvents';
import { getSyncStateValue } from '@/db/syncState';
import { cancelUploadQueueForEvent } from '@/db/uploadQueue';
import { getDatabase } from '@/db';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';
import { deleteEvent } from '@/modules/sync/deleteEvent';

import { deleteMoment } from './deleteMoment';

jest.mock('@/db', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('@/db/localEvents', () => ({
  getLocalEventById: jest.fn(),
  markLocalEventDeleted: jest.fn(),
}));

jest.mock('@/db/localAssets', () => ({
  dismissLocalAssetsForMoment: jest.fn(),
}));

jest.mock('@/db/uploadQueue', () => ({
  cancelUploadQueueForEvent: jest.fn(),
}));

jest.mock('@/db/localEventTombstones', () => ({
  tombstoneLocalEvents: jest.fn(),
}));

jest.mock('@/db/syncState', () => ({
  getSyncStateValue: jest.fn(),
  SYNC_STATE_KEYS: { TIMELINE_GENERATION: 'sync.timeline_generation' },
}));

jest.mock('@/db/eventSyncLock', () => ({
  acquireEventSyncLock: jest.fn(),
}));

jest.mock('@/modules/auth/authService', () => ({
  isRemoteAuthConfigured: jest.fn(),
  getAuthSession: jest.fn(),
}));

jest.mock('@/modules/sync/deleteEvent', () => ({
  deleteEvent: jest.fn(),
}));

const database = {
  runAsync: jest.fn().mockResolvedValue(undefined),
} as unknown as Awaited<ReturnType<typeof getDatabase>>;

const baseLocal = {
  localEventId: 'event-1',
  petId: 'pet-1',
  timestamp: '2026-05-19T12:00:00.000Z',
  source: 'camera_roll' as const,
  eventType: 'unknown' as const,
  caption: null,
  captionLanguage: null,
  confidence: null,
  isFavorite: 0,
  processingState: 'processed',
  selectedAssetIds: '["asset-1"]',
  remoteEventId: 'remote-1',
  serverSyncVersion: 1,
  captionSource: null,
  userEditedCaption: 0,
  userEditedEventType: 0,
  pendingAi: 0,
  syncLockOwner: null,
  pendingCloudSync: 0,
  deletedAt: null,
};

describe('deleteMoment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getDatabase).mockResolvedValue(database);
    jest.mocked(getLocalEventById).mockResolvedValue(baseLocal);
    jest.mocked(dismissLocalAssetsForMoment).mockResolvedValue(1);
    jest.mocked(cancelUploadQueueForEvent).mockResolvedValue(undefined);
    jest.mocked(getSyncStateValue).mockResolvedValue('2');
    jest.mocked(tombstoneLocalEvents).mockResolvedValue(1);
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(false);
  });

  it('soft-deletes locally and dismisses assets when cloud is unavailable', async () => {
    const result = await deleteMoment('event-1');

    expect(result.ok).toBe(true);
    expect(acquireEventSyncLock).toHaveBeenCalledWith(
      database,
      'event-1',
      'user',
    );
    expect(markLocalEventDeleted).toHaveBeenCalledWith(
      database,
      'event-1',
      expect.any(String),
    );
    expect(dismissLocalAssetsForMoment).toHaveBeenCalledWith(
      database,
      ['asset-1'],
      expect.any(String),
    );
    expect(cancelUploadQueueForEvent).toHaveBeenCalledWith(database, 'event-1');
    expect(tombstoneLocalEvents).toHaveBeenCalled();
    expect(deleteEvent).not.toHaveBeenCalled();
  });

  it('calls delete-event when signed in', async () => {
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(true);
    jest.mocked(getAuthSession).mockResolvedValue({
      userId: 'user-1',
      isAnonymous: true,
      email: null,
      emailConfirmed: false,
    });
    jest.mocked(deleteEvent).mockResolvedValue({
      status: 'success',
      response: {
        event_id: 'remote-1',
        server_sync_version: 2,
        deleted_at: '2026-05-20T12:00:00.000Z',
      },
    });

    const result = await deleteMoment('event-1');

    expect(result.ok).toBe(true);
    expect(deleteEvent).toHaveBeenCalledWith({
      source_local_event_id: 'event-1',
    });
  });

  it('returns not found when the moment is missing', async () => {
    jest.mocked(getLocalEventById).mockResolvedValue(null);

    const result = await deleteMoment('missing');

    expect(result).toEqual({ ok: false, errorMessage: 'Moment not found.' });
  });
});
