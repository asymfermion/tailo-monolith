import type * as SQLite from 'expo-sqlite';

import {
  getPromotableEventCandidates,
  upsertLocalEvents,
} from '@/db/localEvents';
import {
  markEventCandidatesProcessed,
  markEventCandidatesProcessing,
} from '@/db/localEventCandidates';

import { promoteScoredCandidatesToLocalEvents } from './eventPromotion';

jest.mock('@/db/localEvents', () => ({
  getPromotableEventCandidates: jest.fn(),
  upsertLocalEvents: jest.fn(),
}));

jest.mock('@/db/localEventCandidates', () => ({
  markEventCandidatesProcessed: jest.fn(),
  markEventCandidatesProcessing: jest.fn(),
}));

jest.mock('@/db/localEventTombstones', () => ({
  clearLocalEventTombstone: jest.fn(),
}));

jest.mock('@/db/eventSyncLock', () => ({
  releaseEventSyncLock: jest.fn(),
}));

jest.mock('@/modules/pets/resolveLocalPetId', () => ({
  resolveLocalPetId: jest.fn().mockResolvedValue('local_pet_1'),
}));

jest.mock('@/modules/sync/enqueueEventMediaUploads', () => ({
  enqueueEventMediaUploads: jest.fn().mockResolvedValue(1),
}));

jest.mock('@/modules/sync/uploadQueueWorker', () => ({
  runUploadQueueWorker: jest.fn().mockResolvedValue({
    processedBatches: 0,
    uploadedAssets: 0,
    failedAssets: 0,
    skippedReason: null,
  }),
}));

describe('promoteScoredCandidatesToLocalEvents', () => {
  const database = {} as SQLite.SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getPromotableEventCandidates).mockResolvedValue([
      {
        localEventId: 'local-event-1',
        timestamp: '2026-05-17T03:30:00.000Z',
        source: 'camera_roll',
        selectedAssetIds: JSON.stringify(['asset-1']),
      },
    ]);
    jest.mocked(upsertLocalEvents).mockResolvedValue(1);
  });

  it('promotes scored candidates into local_events', async () => {
    await expect(
      promoteScoredCandidatesToLocalEvents({ database }),
    ).resolves.toEqual({
      candidateCount: 1,
      promotedCount: 1,
    });

    expect(markEventCandidatesProcessing).toHaveBeenCalledWith(database, [
      'local-event-1',
    ]);
    expect(upsertLocalEvents).toHaveBeenCalledWith(database, [
      expect.objectContaining({
        localEventId: 'local-event-1',
        petId: 'local_pet_1',
        processingState: 'processed',
        selectedAssetIds: ['asset-1'],
      }),
    ]);
    expect(markEventCandidatesProcessed).toHaveBeenCalledWith(database, [
      'local-event-1',
    ]);
  });
});
