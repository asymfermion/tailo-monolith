import type * as SQLite from 'expo-sqlite';
import { UPLOAD_MAX_ASSETS_PER_EVENT } from '@tailo/shared';

import { logDbInfo } from '@/db/dbLogger';
import { getLocalAssetUploadSourcesByIds } from '@/db/localAssets';
import { getLocalEventById } from '@/db/localEvents';
import {
  getPendingUploadQueueItems,
  markUploadQueueItemDone,
  markUploadQueueItemFailed,
  markUploadQueueItemsUploading,
  resetStuckUploadingQueueItems,
  type UploadQueueRow,
} from '@/db/uploadQueue';
import { getAuthSession, isRemoteAuthConfigured } from '@/modules/auth';
import { loadLocalPetProfile } from '@/modules/pets/petProfile';

import { createUploadUrls } from './createUploadUrls';
import { groupUploadQueueByEvent } from './groupUploadQueueByEvent';
import { prepareEventMediaUpload } from './prepareEventMediaUpload';
import { canRetryUpload, getNextUploadAttemptAt } from './uploadRetry';
import { runEventSyncForLocalEvent } from './runEventSync';
import { uploadToSignedUrl } from './uploadToSignedUrl';

export type RunUploadQueueWorkerResult = {
  processedBatches: number;
  uploadedAssets: number;
  failedAssets: number;
  skippedReason: string | null;
};

type PreparedAssetUpload = {
  queueItem: UploadQueueRow;
  sourceLocalAssetId: string;
  contentLength: number;
  width: number;
  height: number;
  originalUri: string;
  thumbnailUri: string;
};

export async function runUploadQueueWorker(
  database: SQLite.SQLiteDatabase,
): Promise<RunUploadQueueWorkerResult> {
  if (!isRemoteAuthConfigured()) {
    return {
      processedBatches: 0,
      uploadedAssets: 0,
      failedAssets: 0,
      skippedReason: 'remote_auth_unconfigured',
    };
  }

  const session = await getAuthSession();

  if (!session) {
    return {
      processedBatches: 0,
      uploadedAssets: 0,
      failedAssets: 0,
      skippedReason: 'missing_session',
    };
  }

  const petProfile = await loadLocalPetProfile();

  if (!petProfile?.remotePetId) {
    return {
      processedBatches: 0,
      uploadedAssets: 0,
      failedAssets: 0,
      skippedReason: 'missing_remote_pet',
    };
  }

  await resetStuckUploadingQueueItems(database);

  const pendingRows = await getPendingUploadQueueItems(database);
  const batches = groupUploadQueueByEvent(pendingRows);

  if (batches.length === 0) {
    return {
      processedBatches: 0,
      uploadedAssets: 0,
      failedAssets: 0,
      skippedReason: null,
    };
  }

  let processedBatches = 0;
  let uploadedAssets = 0;
  let failedAssets = 0;

  for (const batch of batches) {
    const batchResult = await processUploadBatch(
      database,
      batch.localEventId,
      batch.items,
      petProfile.remotePetId,
    );

    processedBatches += batchResult.processed ? 1 : 0;
    uploadedAssets += batchResult.uploadedAssets;
    failedAssets += batchResult.failedAssets;
  }

  return {
    processedBatches,
    uploadedAssets,
    failedAssets,
    skippedReason: null,
  };
}

async function processUploadBatch(
  database: SQLite.SQLiteDatabase,
  localEventId: string,
  queueItems: UploadQueueRow[],
  remotePetId: string,
): Promise<{
  processed: boolean;
  uploadedAssets: number;
  failedAssets: number;
}> {
  if (queueItems.length === 0) {
    return { processed: false, uploadedAssets: 0, failedAssets: 0 };
  }

  if (queueItems.length > UPLOAD_MAX_ASSETS_PER_EVENT) {
    await failQueueItems(
      database,
      queueItems,
      `Too many assets in upload batch (${queueItems.length}).`,
    );
    return {
      processed: true,
      uploadedAssets: 0,
      failedAssets: queueItems.length,
    };
  }

  const localEvent = await getLocalEventById(database, localEventId);

  if (!localEvent) {
    await failQueueItems(database, queueItems, 'Local event not found.');
    return {
      processed: true,
      uploadedAssets: 0,
      failedAssets: queueItems.length,
    };
  }

  const localAssets = await getLocalAssetUploadSourcesByIds(
    database,
    queueItems.map((item) => item.localAssetId),
  );
  const assetsById = new Map(
    localAssets.map((asset) => [asset.localAssetId, asset]),
  );

  await markUploadQueueItemsUploading(
    database,
    queueItems.map((item) => item.id),
  );

  try {
    const preparedUploads: PreparedAssetUpload[] = [];

    for (const queueItem of queueItems) {
      const asset = assetsById.get(queueItem.localAssetId);

      if (!asset) {
        throw new Error(`Missing local asset ${queueItem.localAssetId}.`);
      }

      const prepared = await prepareEventMediaUpload({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      });

      preparedUploads.push({
        queueItem,
        sourceLocalAssetId: queueItem.localAssetId,
        contentLength: prepared.original.byteSize,
        width: prepared.original.width,
        height: prepared.original.height,
        originalUri: prepared.original.uri,
        thumbnailUri: prepared.thumbnail.uri,
      });
    }

    const urlResult = await createUploadUrls({
      pet_id: remotePetId,
      source_local_event_id: localEventId,
      assets: preparedUploads.map((upload) => ({
        source_local_asset_id: upload.sourceLocalAssetId,
        content_length: upload.contentLength,
        width: upload.width,
        height: upload.height,
      })),
    });

    if (urlResult.status === 'error') {
      throw new Error(urlResult.message);
    }

    const signedAssetsById = new Map(
      urlResult.response.assets.map((asset) => [
        asset.source_local_asset_id,
        asset,
      ]),
    );

    let uploadedAssets = 0;

    for (const preparedUpload of preparedUploads) {
      const signedAsset = signedAssetsById.get(
        preparedUpload.sourceLocalAssetId,
      );

      if (!signedAsset) {
        throw new Error(
          `Missing signed URLs for ${preparedUpload.sourceLocalAssetId}.`,
        );
      }

      await uploadToSignedUrl(
        signedAsset.original_upload_url,
        preparedUpload.originalUri,
      );
      await uploadToSignedUrl(
        signedAsset.thumbnail_upload_url,
        preparedUpload.thumbnailUri,
      );

      await markUploadQueueItemDone(
        database,
        preparedUpload.queueItem.id,
        signedAsset.storage_path,
        signedAsset.thumbnail_path,
      );
      uploadedAssets += 1;
    }

    logDbInfo('Upload batch completed', {
      localEventId,
      uploadedAssets,
      remoteEventId: urlResult.response.event_id,
    });

    await runEventSyncForLocalEvent(database, localEventId);

    return {
      processed: true,
      uploadedAssets,
      failedAssets: 0,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Upload batch failed.';

    await failQueueItems(database, queueItems, message);

    logDbInfo('Upload batch failed', { localEventId, message });

    return {
      processed: true,
      uploadedAssets: 0,
      failedAssets: queueItems.length,
    };
  }
}

async function failQueueItems(
  database: SQLite.SQLiteDatabase,
  queueItems: UploadQueueRow[],
  message: string,
): Promise<void> {
  for (const item of queueItems) {
    const nextRetryCount = item.retryCount + 1;
    const nextAttemptAt = canRetryUpload(nextRetryCount)
      ? getNextUploadAttemptAt(nextRetryCount)
      : null;

    await markUploadQueueItemFailed(
      database,
      item.id,
      message,
      nextRetryCount,
      nextAttemptAt,
    );
  }
}
