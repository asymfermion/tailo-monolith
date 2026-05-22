import { acquireEventSyncLock } from '@/db/eventSyncLock';
import { setPrimaryAssetForEvent } from '@/db/localMediaScores';
import { getLocalEventById } from '@/db/localEvents';
import { updateLocalEventSelectedAssetIds } from '@/db/reconcilePromotedEventMedia';
import { scheduleCloudSyncForMoment } from '@/modules/timeline/scheduleCloudSyncForMoment';

import { reorderMomentMedia } from './reorderMomentMedia';

jest.mock('@/db/localEvents', () => ({
  getLocalEventById: jest.fn(),
}));

jest.mock('@/db/reconcilePromotedEventMedia', () => ({
  updateLocalEventSelectedAssetIds: jest.fn(),
}));

jest.mock('@/db/localMediaScores', () => ({
  setPrimaryAssetForEvent: jest.fn(),
}));

jest.mock('@/db/eventSyncLock', () => ({
  acquireEventSyncLock: jest.fn(),
}));

jest.mock('@/modules/timeline/scheduleCloudSyncForMoment', () => ({
  scheduleCloudSyncForMoment: jest.fn(),
}));

describe('reorderMomentMedia', () => {
  const database = {
    runAsync: jest.fn().mockResolvedValue(undefined),
  } as never;

  beforeEach(() => {
    jest.clearAllMocks();
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
      selectedAssetIds: '["asset-1","asset-2"]',
      remoteEventId: 'remote-1',
      serverSyncVersion: 1,
      captionSource: null,
      userEditedCaption: 0,
      userEditedEventType: 0,
      pendingAi: 0,
      syncLockOwner: null,
      pendingCloudSync: 0,
      deletedAt: null,
    });
  });

  it('persists order, primary, and schedules cloud sync', async () => {
    const saved = await reorderMomentMedia(database, 'event-1', [
      'asset-2',
      'asset-1',
    ]);

    expect(saved).toBe(true);
    expect(updateLocalEventSelectedAssetIds).toHaveBeenCalledWith(
      database,
      'event-1',
      ['asset-2', 'asset-1'],
    );
    expect(setPrimaryAssetForEvent).toHaveBeenCalledWith(
      database,
      'event-1',
      'asset-2',
    );
    expect(acquireEventSyncLock).toHaveBeenCalledWith(
      database,
      'event-1',
      'user',
    );
    expect(scheduleCloudSyncForMoment).toHaveBeenCalledWith('event-1');
  });
});
