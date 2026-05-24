import {
  getPendingUploadQueueItems,
  markUploadQueueItemDone,
  markUploadQueueItemsUploading,
  resetStuckUploadingQueueItems,
} from '@/db/uploadQueue';
import { getLocalAssetUploadSourcesByIds } from '@/db/localAssets';
import { getLocalEventById } from '@/db/localEvents';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';
import { loadLocalPetProfile } from '@/modules/pets/petProfile';
import { createUploadUrls } from './createUploadUrls';
import { prepareEventMediaUpload } from './prepareEventMediaUpload';
import { prepareCloudUploadPrerequisites } from './prepareCloudUploadPrerequisites';
import { runUploadQueueWorker } from './uploadQueueWorker';
import { runPendingCloudSyncForEvent } from './runPendingCloudSync';
import { uploadToSignedUrl } from './uploadToSignedUrl';

jest.mock('@/modules/auth/authService', () => ({
  isRemoteAuthConfigured: jest.fn(),
  getAuthSession: jest.fn(),
}));

jest.mock('@/modules/pets/petProfile', () => ({
  loadLocalPetProfile: jest.fn(),
}));

jest.mock('./prepareCloudUploadPrerequisites', () => ({
  prepareCloudUploadPrerequisites: jest.fn(),
}));

jest.mock('./createUploadUrls', () => ({
  createUploadUrls: jest.fn(),
}));

jest.mock('./prepareEventMediaUpload', () => ({
  prepareEventMediaUpload: jest.fn(),
}));

jest.mock('./uploadToSignedUrl', () => ({
  uploadToSignedUrl: jest.fn(),
}));

jest.mock('./runPendingCloudSync', () => ({
  runPendingCloudSyncForEvent: jest
    .fn()
    .mockResolvedValue({ status: 'synced' }),
}));

jest.mock('@/db/uploadQueue', () => ({
  getPendingUploadQueueItems: jest.fn(),
  markUploadQueueItemDone: jest.fn(),
  markUploadQueueItemFailed: jest.fn(),
  markUploadQueueItemsUploading: jest.fn(),
  resetStuckUploadingQueueItems: jest.fn(),
}));

jest.mock('@/db/localEvents', () => ({
  getLocalEventById: jest.fn(),
}));

jest.mock('@/db/localAssets', () => ({
  getLocalAssetUploadSourcesByIds: jest.fn(),
}));

describe('runUploadQueueWorker', () => {
  const database = {} as never;

  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .mocked(runPendingCloudSyncForEvent)
      .mockResolvedValue({ status: 'synced' });
    jest.mocked(resetStuckUploadingQueueItems).mockResolvedValue();
    jest.mocked(getPendingUploadQueueItems).mockResolvedValue([]);
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(true);
    jest.mocked(getAuthSession).mockResolvedValue({
      userId: 'user-1',
      isAnonymous: true,
      email: null,
      emailConfirmed: false,
    });
    jest.mocked(loadLocalPetProfile).mockResolvedValue({
      petId: 'local_pet_1',
      name: 'Miso',
      type: 'cat',
      gender: null,
      birthday: null,
      profilePhotoLocalAssetId: null,
      profilePhotoUri: null,
      remotePetId: 'pet-remote-1',
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
    });
    jest.mocked(prepareCloudUploadPrerequisites).mockResolvedValue({
      remotePetId: 'pet-remote-1',
    });
  });

  it('prepares cloud upload prerequisites before checking remote pet id', async () => {
    jest.mocked(loadLocalPetProfile).mockResolvedValue(null);
    jest.mocked(prepareCloudUploadPrerequisites).mockResolvedValue({
      remotePetId: null,
    });

    await runUploadQueueWorker(database);

    expect(prepareCloudUploadPrerequisites).toHaveBeenCalledTimes(1);
  });

  it('skips when remote pet id is missing', async () => {
    jest.mocked(loadLocalPetProfile).mockResolvedValue(null);
    jest.mocked(prepareCloudUploadPrerequisites).mockResolvedValue({
      remotePetId: null,
    });

    await expect(runUploadQueueWorker(database)).resolves.toEqual({
      processedBatches: 0,
      uploadedAssets: 0,
      failedAssets: 0,
      skippedReason: 'missing_remote_pet',
    });
  });

  it('uploads a pending batch', async () => {
    jest.mocked(getPendingUploadQueueItems).mockResolvedValue([
      {
        id: 'upload_event-1_asset-1',
        localEventId: 'event-1',
        localAssetId: 'asset-1',
        status: 'pending',
        retryCount: 0,
        lastError: null,
        storagePath: null,
        thumbnailPath: null,
        nextAttemptAt: null,
      },
    ]);
    jest.mocked(getLocalEventById).mockResolvedValue({
      localEventId: 'event-1',
      petId: 'local_pet_1',
      timestamp: '2026-05-18T00:00:00.000Z',
      source: 'camera_roll',
      eventType: 'unknown',
      caption: null,
      captionLanguage: null,
      confidence: null,
      isFavorite: 0,
      processingState: 'processed',
      selectedAssetIds: '["asset-1"]',
      remoteEventId: null,
      serverSyncVersion: 0,
      captionSource: null,
      userEditedCaption: 0,
      userEditedEventType: 0,
      pendingAi: 0,
      syncLockOwner: null,
      pendingCloudSync: 0,
      deletedAt: null,
    });
    jest.mocked(getLocalAssetUploadSourcesByIds).mockResolvedValue([
      {
        localAssetId: 'asset-1',
        uri: 'file:///asset-1.jpg',
        width: 2000,
        height: 1500,
      },
    ]);
    jest.mocked(prepareEventMediaUpload).mockResolvedValue({
      original: {
        uri: 'file:///original.jpg',
        width: 1280,
        height: 960,
        byteSize: 500_000,
      },
      thumbnail: {
        uri: 'file:///thumb.jpg',
        width: 400,
        height: 300,
        byteSize: 80_000,
      },
    });
    jest.mocked(createUploadUrls).mockResolvedValue({
      status: 'success',
      response: {
        event_id: 'remote-event-1',
        assets: [
          {
            source_local_asset_id: 'asset-1',
            original_upload_url: 'https://example.com/original',
            thumbnail_upload_url: 'https://example.com/thumb',
            storage_path: 'user/pet/event/asset-1/original.jpg',
            thumbnail_path: 'user/pet/event/asset-1/thumb.jpg',
            expires_at: '2026-05-18T01:00:00.000Z',
          },
        ],
      },
    });

    await expect(runUploadQueueWorker(database)).resolves.toEqual({
      processedBatches: 1,
      uploadedAssets: 1,
      failedAssets: 0,
      skippedReason: null,
    });

    expect(markUploadQueueItemsUploading).toHaveBeenCalled();
    expect(uploadToSignedUrl).toHaveBeenCalledTimes(2);
    expect(markUploadQueueItemDone).toHaveBeenCalledWith(
      database,
      'upload_event-1_asset-1',
      'user/pet/event/asset-1/original.jpg',
      'user/pet/event/asset-1/thumb.jpg',
    );
    expect(runPendingCloudSyncForEvent).toHaveBeenCalledWith(
      database,
      'event-1',
    );
  });
});
