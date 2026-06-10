import type * as SQLite from 'expo-sqlite';

import { runNotificationSyncPass } from '@/modules/notifications';
import { syncRemotePetProfileIfNeeded } from '@/modules/pets';

import { pollEventUpdates } from './pollEventUpdates';
import { runCloudSyncPass } from './runCloudSyncPass';
import { runPendingCloudSync } from './runPendingCloudSync';
import { runUploadQueueWorker } from './uploadQueueWorker';

jest.mock('@/modules/pets', () => ({
  syncRemotePetProfileIfNeeded: jest.fn(),
}));

jest.mock('./uploadQueueWorker', () => ({
  runUploadQueueWorker: jest.fn(),
}));

jest.mock('./runPendingCloudSync', () => ({
  runPendingCloudSync: jest.fn(),
}));

jest.mock('./pollEventUpdates', () => ({
  pollEventUpdates: jest.fn(),
}));

jest.mock('@/modules/notifications', () => ({
  runNotificationSyncPass: jest.fn(),
}));

describe('runCloudSyncPass', () => {
  const database = {} as SQLite.SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(syncRemotePetProfileIfNeeded).mockResolvedValue({
      status: 'synced',
      response: {
        pet_id: 'pet-remote-1',
        created: false,
      },
    });
    jest.mocked(runUploadQueueWorker).mockResolvedValue({
      processedBatches: 1,
      uploadedAssets: 2,
      failedAssets: 0,
      skippedReason: null,
    });
    jest.mocked(runPendingCloudSync).mockResolvedValue({
      attempted: 1,
      synced: 1,
      skipped: 0,
      errors: 0,
    });
    jest
      .mocked(pollEventUpdates)
      .mockResolvedValue({ applied: 0, skippedReason: null });
    jest.mocked(runNotificationSyncPass).mockResolvedValue({
      pushed: 0,
      pulled: 0,
      errors: 0,
      skippedReason: null,
    });
  });

  it('syncs remote pet before draining upload queue and pending edits', async () => {
    const callOrder: string[] = [];

    jest.mocked(syncRemotePetProfileIfNeeded).mockImplementation(async () => {
      callOrder.push('pet');
      return { status: 'synced', response: {} as never };
    });
    jest.mocked(runUploadQueueWorker).mockImplementation(async () => {
      callOrder.push('upload');
      return {
        processedBatches: 0,
        uploadedAssets: 0,
        failedAssets: 0,
        skippedReason: null,
      };
    });
    jest.mocked(runPendingCloudSync).mockImplementation(async () => {
      callOrder.push('edits');
      return { attempted: 0, synced: 0, skipped: 0, errors: 0 };
    });
    jest.mocked(pollEventUpdates).mockImplementation(async () => {
      callOrder.push('poll');
      return { applied: 0, skippedReason: null };
    });
    jest.mocked(runNotificationSyncPass).mockImplementation(async () => {
      callOrder.push('notifications');
      return {
        pushed: 0,
        pulled: 0,
        errors: 0,
        skippedReason: null,
      };
    });

    await runCloudSyncPass(database);

    expect(callOrder).toEqual(['pet', 'upload', 'edits', 'poll', 'notifications']);
  });
});
