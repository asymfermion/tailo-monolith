import type * as SQLite from 'expo-sqlite';

import {
  updateLocalAssetDetectionResults,
  upsertLocalAssets,
} from '@/db/localAssets';
import { upsertLocalEventCandidates } from '@/db/localEventCandidates';
import { upsertLocalEvents } from '@/db/localEvents';
import { upsertLocalMediaScores } from '@/db/localMediaScores';

import { createInAppCaptureEvent } from './createInAppCaptureEvent';

jest.mock('@/db/localAssets', () => ({
  upsertLocalAssets: jest.fn(),
  updateLocalAssetDetectionResults: jest.fn(),
}));

jest.mock('@/db/localEventCandidates', () => ({
  upsertLocalEventCandidates: jest.fn(),
}));

jest.mock('@/db/localEvents', () => ({
  upsertLocalEvents: jest.fn(),
}));

jest.mock('@/db/localMediaScores', () => ({
  upsertLocalMediaScores: jest.fn(),
}));

jest.mock('@/modules/pets/resolveLocalPetId', () => ({
  resolveLocalPetId: jest.fn().mockResolvedValue('local_pet_1'),
}));

jest.mock('@/modules/pets/petProfile', () => ({
  loadLocalPetProfile: jest.fn().mockResolvedValue({
    petId: 'local_pet_1',
    type: 'cat',
  }),
}));

jest.mock('@/modules/sync', () => ({
  enqueueEventMediaUploads: jest.fn().mockResolvedValue(1),
}));

describe('createInAppCaptureEvent', () => {
  const database = {} as SQLite.SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists capture asset, score, and promoted event', async () => {
    await expect(
      createInAppCaptureEvent(database, {
        localAssetId: 'in_app_abc',
        uri: 'file:///captures/in_app_abc.jpg',
        width: 1080,
        height: 1440,
        capturedAt: '2026-05-18T12:00:00.000Z',
      }),
    ).resolves.toEqual({
      localEventId: 'capture_event_in_app_abc',
      localAssetId: 'in_app_abc',
    });

    expect(upsertLocalAssets).toHaveBeenCalled();
    expect(updateLocalAssetDetectionResults).toHaveBeenCalledWith(database, [
      expect.objectContaining({
        localAssetId: 'in_app_abc',
        detectionSource: 'in_app',
      }),
    ]);
    expect(upsertLocalEventCandidates).toHaveBeenCalledWith(database, [
      expect.objectContaining({
        localEventId: 'capture_event_in_app_abc',
        source: 'in_app',
        candidateStatus: 'ready',
        processingState: 'processed',
        selectedAssetIds: ['in_app_abc'],
      }),
    ]);
    expect(upsertLocalMediaScores).toHaveBeenCalled();
    expect(upsertLocalEvents).toHaveBeenCalledWith(database, [
      expect.objectContaining({
        localEventId: 'capture_event_in_app_abc',
        source: 'in_app',
      }),
    ]);
  });
});
